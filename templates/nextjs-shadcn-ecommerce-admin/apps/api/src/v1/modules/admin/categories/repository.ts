import { asc, eq } from "drizzle-orm";
import { isUniqueViolation, schema, withPlatformSession } from "@/lib/db";
import { toSlug } from "@/lib/utils";
import { DuplicateSlugHttpError } from "@/v1/res/errors";
import type { Category, CategoryCreate, CategoryUpdate } from "./types";

const { categories } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — this table
 * carries no `tenant_id` column at all (single-tenant-per-deployment,
 * design decision A4), same reasoning already applied to the `Dlocal`
 * module's repository in Phase 3a.
 */

function toCategory(row: typeof categories.$inferSelect): Category {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		isActive: row.isActive,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export interface Repository {
	getAll: () => Promise<Category[]>;
	getById: (id: string) => Promise<Category | null>;
	create: (input: CategoryCreate) => Promise<Category>;
	update: (id: string, input: CategoryUpdate) => Promise<Category | null>;
	delete: (id: string) => Promise<boolean>;
}

function categoryRepo(): Repository {
	async function getAll(): ReturnType<Repository["getAll"]> {
		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(categories)
				.orderBy(asc(categories.name));

			return rows.map(toCategory);
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(categories)
				.where(eq(categories.id, id));

			return row ? toCategory(row) : null;
		});
	}

	async function create(
		input: CategoryCreate,
	): ReturnType<Repository["create"]> {
		const slug = toSlug(input.name);

		return withPlatformSession(async (tx) => {
			try {
				const [inserted] = await tx
					.insert(categories)
					.values({ name: input.name, slug })
					.returning();

				return toCategory(inserted);
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
		input: CategoryUpdate,
	): ReturnType<Repository["update"]> {
		const values: Partial<typeof categories.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (input.name !== undefined) {
			values.name = input.name;
			values.slug = toSlug(input.name);
		}
		if (input.isActive !== undefined) {
			values.isActive = input.isActive;
		}

		return withPlatformSession(async (tx) => {
			try {
				const [row] = await tx
					.update(categories)
					.set(values)
					.where(eq(categories.id, id))
					.returning();

				return row ? toCategory(row) : null;
			} catch (e) {
				if (isUniqueViolation(e) && values.slug) {
					throw new DuplicateSlugHttpError(values.slug);
				}
				throw e;
			}
		});
	}

	/**
	 * @description Soft delete (`isActive: false`), matching munod's real
	 * `admin/categories` convention — categories are never hard-deleted since
	 * `products.category_id` references them (no `onDelete` cascade on that
	 * FK, `src/lib/db/schema.ts`).
	 */
	async function deleteOne(id: string): ReturnType<Repository["delete"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.update(categories)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(categories.id, id))
				.returning({ id: categories.id });

			return Boolean(row);
		});
	}

	return { getAll, getById, create, update, delete: deleteOne };
}

export { categoryRepo as createCategoryRepository };
