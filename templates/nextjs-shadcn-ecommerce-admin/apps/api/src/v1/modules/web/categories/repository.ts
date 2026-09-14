import { asc, eq } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
import type { Category } from "@/v1/modules/admin/categories/types";

const { categories } = schema;

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
	getActive: () => Promise<Category[]>;
}

/**
 * @description `ecommerce-admin-template` domain (Phase 3b) — public,
 * unauthenticated storefront reads. Reuses `admin/categories`'s own
 * `Category` type/schema (not a duplicate) — `.meta({id: "Category"})` is
 * a GLOBAL registry id (`z.globalRegistry`, ADR 0040), so a second
 * top-level `.meta({id: "Category"})` schema here would collide at build
 * time. Always filters `is_active = true` — the one thing that actually
 * differs from the admin read.
 */
function categoryRepo(): Repository {
	async function getActive(): ReturnType<Repository["getActive"]> {
		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(categories)
				.where(eq(categories.isActive, true))
				.orderBy(asc(categories.name));

			return rows.map(toCategory);
		});
	}

	return { getActive };
}

export { categoryRepo as createWebCategoryRepository };
