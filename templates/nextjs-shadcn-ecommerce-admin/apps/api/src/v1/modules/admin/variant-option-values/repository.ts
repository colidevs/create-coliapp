import { asc, eq } from "drizzle-orm";
import { isUniqueViolation, schema, withPlatformSession } from "@/lib/db";
import { toSlug } from "@/lib/utils";
import { DuplicateSlugHttpError } from "@/v1/res/errors";
import type {
	GetVariantOptionValuesParams,
	VariantOptionValue,
	VariantOptionValueCreate,
	VariantOptionValueUpdate,
} from "./types";

const { variantOptionValues } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — this table
 * carries no `tenant_id` column at all (single-tenant-per-deployment, design
 * decision A4), same reasoning `admin/variant-option-types/repository.ts`
 * already applies.
 */

function toVariantOptionValue(
	row: typeof variantOptionValues.$inferSelect,
): VariantOptionValue {
	return {
		id: row.id,
		optionTypeId: row.optionTypeId,
		value: row.value,
		slug: row.slug,
		imageUrl: row.imageUrl,
		description: row.description,
		displayOrder: row.displayOrder,
		isActive: row.isActive,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export interface Repository {
	get: (params: GetVariantOptionValuesParams) => Promise<VariantOptionValue[]>;
	getById: (id: string) => Promise<VariantOptionValue | null>;
	create: (input: VariantOptionValueCreate) => Promise<VariantOptionValue>;
	update: (
		id: string,
		input: VariantOptionValueUpdate,
	) => Promise<VariantOptionValue | null>;
	delete: (id: string) => Promise<boolean>;
}

function variantOptionValueRepo(): Repository {
	async function get(
		params: GetVariantOptionValuesParams,
	): ReturnType<Repository["get"]> {
		const where = params.optionTypeId
			? eq(variantOptionValues.optionTypeId, params.optionTypeId)
			: undefined;

		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(variantOptionValues)
				.where(where)
				.orderBy(
					asc(variantOptionValues.displayOrder),
					asc(variantOptionValues.value),
				);

			return rows.map(toVariantOptionValue);
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(variantOptionValues)
				.where(eq(variantOptionValues.id, id));

			return row ? toVariantOptionValue(row) : null;
		});
	}

	async function create(
		input: VariantOptionValueCreate,
	): ReturnType<Repository["create"]> {
		const slug = toSlug(input.value);

		return withPlatformSession(async (tx) => {
			try {
				const [inserted] = await tx
					.insert(variantOptionValues)
					.values({
						optionTypeId: input.optionTypeId,
						value: input.value,
						slug,
						...(input.imageUrl !== undefined
							? { imageUrl: input.imageUrl }
							: {}),
						...(input.description !== undefined
							? { description: input.description }
							: {}),
						...(input.displayOrder !== undefined
							? { displayOrder: input.displayOrder }
							: {}),
					})
					.returning();

				return toVariantOptionValue(inserted);
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
		input: VariantOptionValueUpdate,
	): ReturnType<Repository["update"]> {
		const values: Partial<typeof variantOptionValues.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (input.value !== undefined) {
			values.value = input.value;
			values.slug = toSlug(input.value);
		}
		if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl;
		if (input.description !== undefined) values.description = input.description;
		if (input.displayOrder !== undefined) {
			values.displayOrder = input.displayOrder;
		}
		if (input.isActive !== undefined) values.isActive = input.isActive;

		return withPlatformSession(async (tx) => {
			try {
				const [row] = await tx
					.update(variantOptionValues)
					.set(values)
					.where(eq(variantOptionValues.id, id))
					.returning();

				return row ? toVariantOptionValue(row) : null;
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
	 * option value must stay resolvable for historical variants, matching
	 * `admin/variant-option-types/repository.ts`'s existing soft-delete
	 * convention.
	 */
	async function deleteOne(id: string): ReturnType<Repository["delete"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.update(variantOptionValues)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(variantOptionValues.id, id))
				.returning({ id: variantOptionValues.id });

			return Boolean(row);
		});
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { variantOptionValueRepo as createVariantOptionValueRepository };
