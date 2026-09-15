import { asc, eq } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
import { toSlug } from "@/lib/utils";
import { DuplicateSlugHttpError } from "@/v1/res/errors";
import type {
	VariantOptionType,
	VariantOptionTypeCreate,
	VariantOptionTypeUpdate,
} from "./types";

const { variantOptionTypes } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — this table
 * carries no `tenant_id` column at all (single-tenant-per-deployment, design
 * decision A4), same reasoning `admin/categories/repository.ts` already
 * applies.
 */

function toVariantOptionType(
	row: typeof variantOptionTypes.$inferSelect,
): VariantOptionType {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		displayOrder: row.displayOrder,
		isActive: row.isActive,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

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

/**
 * @description Duck-types `pg`'s own unique-violation error shape
 * (`code === "23505"`) — the same detection `admin/categories/repository.ts`
 * already relies on for its own `slug` uniqueness handling.
 */
function isUniqueViolation(e: unknown): boolean {
	return getPgErrorCode(e) === "23505";
}

export interface Repository {
	getAll: () => Promise<VariantOptionType[]>;
	getById: (id: string) => Promise<VariantOptionType | null>;
	create: (input: VariantOptionTypeCreate) => Promise<VariantOptionType>;
	update: (
		id: string,
		input: VariantOptionTypeUpdate,
	) => Promise<VariantOptionType | null>;
	delete: (id: string) => Promise<boolean>;
}

function variantOptionTypeRepo(): Repository {
	async function getAll(): ReturnType<Repository["getAll"]> {
		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(variantOptionTypes)
				.orderBy(
					asc(variantOptionTypes.displayOrder),
					asc(variantOptionTypes.name),
				);

			return rows.map(toVariantOptionType);
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(variantOptionTypes)
				.where(eq(variantOptionTypes.id, id));

			return row ? toVariantOptionType(row) : null;
		});
	}

	async function create(
		input: VariantOptionTypeCreate,
	): ReturnType<Repository["create"]> {
		const slug = toSlug(input.name);

		return withPlatformSession(async (tx) => {
			try {
				const [inserted] = await tx
					.insert(variantOptionTypes)
					.values({
						name: input.name,
						slug,
						...(input.displayOrder !== undefined
							? { displayOrder: input.displayOrder }
							: {}),
					})
					.returning();

				return toVariantOptionType(inserted);
			} catch (e) {
				if (isUniqueViolation(e)) {
					throw new DuplicateSlugHttpError(slug);
				}
				throw e;
			}
		});
	}

	async function update(
		id: string,
		input: VariantOptionTypeUpdate,
	): ReturnType<Repository["update"]> {
		const values: Partial<typeof variantOptionTypes.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (input.name !== undefined) {
			values.name = input.name;
			values.slug = toSlug(input.name);
		}
		if (input.displayOrder !== undefined) {
			values.displayOrder = input.displayOrder;
		}
		if (input.isActive !== undefined) {
			values.isActive = input.isActive;
		}

		return withPlatformSession(async (tx) => {
			try {
				const [row] = await tx
					.update(variantOptionTypes)
					.set(values)
					.where(eq(variantOptionTypes.id, id))
					.returning();

				return row ? toVariantOptionType(row) : null;
			} catch (e) {
				if (isUniqueViolation(e) && values.slug) {
					throw new DuplicateSlugHttpError(values.slug);
				}
				throw e;
			}
		});
	}

	/**
	 * @description Soft delete (`isActive: false`, design D6) — a bound
	 * option type must stay resolvable for historical variants, matching
	 * `admin/categories/repository.ts`'s existing soft-delete convention.
	 */
	async function deleteOne(id: string): ReturnType<Repository["delete"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.update(variantOptionTypes)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(variantOptionTypes.id, id))
				.returning({ id: variantOptionTypes.id });

			return Boolean(row);
		});
	}

	return { getAll, getById, create, update, delete: deleteOne };
}

export { variantOptionTypeRepo as createVariantOptionTypeRepository };
