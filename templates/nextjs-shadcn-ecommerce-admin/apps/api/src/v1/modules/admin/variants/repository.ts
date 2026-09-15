import { and, asc, eq, inArray, ne } from "drizzle-orm";
import type { Tx } from "@/lib/db";
import { schema, withPlatformSession } from "@/lib/db";
import { ProductRequiresActiveVariantHttpError } from "@/v1/res/errors";
import type {
	GetVariantsParams,
	Variant,
	VariantCreate,
	VariantUpdate,
} from "./types";

const { productVariants, variantOptionSelections } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — same
 * reasoning as every other admin module in this template (no `tenant_id`
 * column, design decision A4).
 */

function toVariant(
	row: typeof productVariants.$inferSelect,
	optionValueIds: string[],
): Variant {
	return {
		id: row.id,
		productId: row.productId,
		code: row.code,
		altCode: row.altCode,
		price: Number(row.price),
		stock: row.stock,
		stockMin: row.stockMin,
		isDefault: row.isDefault,
		isActive: row.isActive,
		displayOrder: row.displayOrder,
		optionValueIds,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

/**
 * @description `variant-options` domain (`sdd/ecommerce-product-variants/
 * design`). Postgres `23514` (`check_violation`), raised at COMMIT by the
 * deferrable constraint trigger `trg_variant_keeps_product_publishable`
 * (`drizzle/0005_variant_rls_and_invariants.sql`, fires `AFTER UPDATE OR
 * DELETE ON product_variants`) when a variant update/delete leaves an
 * active product with zero active variants. Same `.code` detection shape
 * `admin/products/repository.ts` already uses for the sibling
 * `trg_product_requires_active_variant` trigger. The trigger does NOT fire
 * on `INSERT` into `product_variants` (adding a variant only ever helps
 * publishability), so `create()` below needs no such catch.
 */
/**
 * @description Reads the real Postgres error code off a thrown error.
 * `drizzle-orm@0.45.2` wraps every raw `pg` driver error inside its own
 * `DrizzleQueryError`, nesting the original error — the one that actually
 * carries `.code` (e.g. `23505`/`23514`) — under `.cause`, never on the
 * thrown error itself (`drizzle-orm/errors.js`, verified against the
 * installed version). Falls back to `.code` directly in case some other
 * code path throws a raw, unwrapped `pg` error.
 */
function getPgErrorCode(e: unknown): string | undefined {
	if (typeof e !== "object" || e === null) {
		return undefined;
	}
	const cause = (e as { cause?: unknown }).cause;
	if (
		typeof cause === "object" &&
		cause !== null &&
		"code" in cause &&
		typeof (cause as { code?: unknown }).code === "string"
	) {
		return (cause as { code: string }).code;
	}
	if ("code" in e && typeof (e as { code?: unknown }).code === "string") {
		return (e as { code: string }).code;
	}
	return undefined;
}

function isCheckViolation(e: unknown): boolean {
	return getPgErrorCode(e) === "23514";
}

/**
 * @description Loads every variant's `optionValueIds` in one query (never
 * N+1), keyed by `variantId`. Returns an empty map for an empty input, so
 * callers never need to special-case a zero-row page.
 */
async function loadSelectionsByVariantId(
	tx: Tx,
	variantIds: string[],
): Promise<Map<string, string[]>> {
	const byVariant = new Map<string, string[]>();

	if (variantIds.length === 0) {
		return byVariant;
	}

	const rows = await tx
		.select()
		.from(variantOptionSelections)
		.where(inArray(variantOptionSelections.variantId, variantIds));

	for (const row of rows) {
		const existing = byVariant.get(row.variantId);
		if (existing) {
			existing.push(row.optionValueId);
		} else {
			byVariant.set(row.variantId, [row.optionValueId]);
		}
	}

	return byVariant;
}

/**
 * @description Design D7 — the partial unique index
 * `uq_product_variants_default` (`WHERE is_default`) is the DB-enforced
 * backstop, but a bare insert/update that trips it would just surface as a
 * `23505` conflict. This is the application-level half of the invariant:
 * proactively clear any other default variant of the same product, in the
 * SAME transaction as the write that sets the new one, so "mark as
 * default" behaves as a swap, not a rejected write.
 */
async function clearSiblingDefault(
	tx: Tx,
	productId: string,
	excludeVariantId?: string,
): Promise<void> {
	const conditions = [
		eq(productVariants.productId, productId),
		eq(productVariants.isDefault, true),
	];
	if (excludeVariantId) {
		conditions.push(ne(productVariants.id, excludeVariantId));
	}

	await tx
		.update(productVariants)
		.set({ isDefault: false, updatedAt: new Date() })
		.where(and(...conditions));
}

/**
 * @description Set-replacement, never a delta/merge: delete every existing
 * selection row for this variant, then insert the new set (skipped when
 * empty — a variant may legitimately have zero option-value selections,
 * e.g. a single-variant product with no option types).
 */
async function replaceSelections(
	tx: Tx,
	variantId: string,
	optionValueIds: string[],
): Promise<void> {
	await tx
		.delete(variantOptionSelections)
		.where(eq(variantOptionSelections.variantId, variantId));

	if (optionValueIds.length > 0) {
		await tx.insert(variantOptionSelections).values(
			optionValueIds.map((optionValueId) => ({
				variantId,
				optionValueId,
			})),
		);
	}
}

export interface Repository {
	get: (params: GetVariantsParams) => Promise<Variant[]>;
	getById: (id: string) => Promise<Variant | null>;
	create: (input: VariantCreate) => Promise<Variant>;
	update: (id: string, input: VariantUpdate) => Promise<Variant | null>;
	delete: (id: string) => Promise<boolean>;
}

function variantRepo(): Repository {
	async function get(params: GetVariantsParams): ReturnType<Repository["get"]> {
		const where = params.productId
			? eq(productVariants.productId, params.productId)
			: undefined;

		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(productVariants)
				.where(where)
				.orderBy(
					asc(productVariants.displayOrder),
					asc(productVariants.createdAt),
				);

			const selections = await loadSelectionsByVariantId(
				tx,
				rows.map((row) => row.id),
			);

			return rows.map((row) => toVariant(row, selections.get(row.id) ?? []));
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(productVariants)
				.where(eq(productVariants.id, id));

			if (!row) {
				return null;
			}

			const selections = await loadSelectionsByVariantId(tx, [row.id]);

			return toVariant(row, selections.get(row.id) ?? []);
		});
	}

	/**
	 * @description No outer `try`/`catch` for `23514` here — the trigger only
	 * fires on `UPDATE`/`DELETE` of `product_variants`, never on `INSERT`
	 * (see `isCheckViolation`'s own doc comment above).
	 */
	async function create(
		input: VariantCreate,
	): ReturnType<Repository["create"]> {
		return withPlatformSession(async (tx) => {
			if (input.isDefault) {
				await clearSiblingDefault(tx, input.productId);
			}

			const [inserted] = await tx
				.insert(productVariants)
				.values({
					productId: input.productId,
					code: input.code ?? null,
					altCode: input.altCode ?? null,
					price: input.price.toFixed(2),
					...(input.stock !== undefined ? { stock: input.stock } : {}),
					...(input.stockMin !== undefined ? { stockMin: input.stockMin } : {}),
					...(input.isDefault !== undefined
						? { isDefault: input.isDefault }
						: {}),
					...(input.displayOrder !== undefined
						? { displayOrder: input.displayOrder }
						: {}),
				})
				.returning();

			const optionValueIds = input.optionValueIds ?? [];
			if (optionValueIds.length > 0) {
				await tx.insert(variantOptionSelections).values(
					optionValueIds.map((optionValueId) => ({
						variantId: inserted.id,
						optionValueId,
					})),
				);
			}

			return toVariant(inserted, optionValueIds);
		});
	}

	/**
	 * @description The `try`/`catch` wraps the ENTIRE `withPlatformSession`
	 * call, not just the statements inside it — `trg_variant_keeps_product_
	 * publishable` is `DEFERRABLE INITIALLY DEFERRED`, so a `23514` it raises
	 * surfaces at COMMIT time, i.e. from `withPlatformSession`'s own returned
	 * promise, AFTER the transaction callback has already returned normally.
	 * Same placement `admin/products/repository.ts#update` already uses for
	 * the sibling trigger.
	 */
	async function update(
		id: string,
		input: VariantUpdate,
	): ReturnType<Repository["update"]> {
		const values: Partial<typeof productVariants.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (input.code !== undefined) values.code = input.code;
		if (input.altCode !== undefined) values.altCode = input.altCode;
		if (input.price !== undefined) values.price = input.price.toFixed(2);
		if (input.stock !== undefined) values.stock = input.stock;
		if (input.stockMin !== undefined) values.stockMin = input.stockMin;
		if (input.displayOrder !== undefined) {
			values.displayOrder = input.displayOrder;
		}
		if (input.isActive !== undefined) values.isActive = input.isActive;
		if (input.isDefault !== undefined) values.isDefault = input.isDefault;

		try {
			return await withPlatformSession(async (tx) => {
				const [existing] = await tx
					.select()
					.from(productVariants)
					.where(eq(productVariants.id, id));

				if (!existing) {
					return null;
				}

				if (input.isDefault === true) {
					await clearSiblingDefault(tx, existing.productId, id);
				}

				const [row] = await tx
					.update(productVariants)
					.set(values)
					.where(eq(productVariants.id, id))
					.returning();

				if (!row) {
					return null;
				}

				let optionValueIds: string[];
				if (input.optionValueIds !== undefined) {
					await replaceSelections(tx, id, input.optionValueIds);
					optionValueIds = input.optionValueIds;
				} else {
					const selections = await loadSelectionsByVariantId(tx, [id]);
					optionValueIds = selections.get(id) ?? [];
				}

				return toVariant(row, optionValueIds);
			});
		} catch (e) {
			if (isCheckViolation(e)) {
				throw new ProductRequiresActiveVariantHttpError();
			}
			throw e;
		}
	}

	/**
	 * @description Hard delete — unlike `variant-option-types`/`-values`'
	 * soft-delete convention (design D6, which exists because a bound option
	 * value must stay resolvable for HISTORICAL variants), a deleted variant
	 * has no equivalent live-FK consumer: an order's `buyer_products` JSON
	 * snapshot (`Dlocal/repository.ts`) stores `variantId` as plain data, not
	 * a foreign key. `product_images.variant_id` and
	 * `variant_option_selections.variant_id` both cascade on delete (schema),
	 * so no manual cleanup is needed here. Same deferred-trigger outer-catch
	 * placement as `update()` above.
	 */
	async function deleteOne(id: string): ReturnType<Repository["delete"]> {
		try {
			return await withPlatformSession(async (tx) => {
				const [row] = await tx
					.delete(productVariants)
					.where(eq(productVariants.id, id))
					.returning({ id: productVariants.id });

				return Boolean(row);
			});
		} catch (e) {
			if (isCheckViolation(e)) {
				throw new ProductRequiresActiveVariantHttpError();
			}
			throw e;
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { variantRepo as createVariantRepository };
