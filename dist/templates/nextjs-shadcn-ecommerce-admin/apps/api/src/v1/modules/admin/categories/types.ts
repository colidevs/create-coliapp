import { z } from "zod";

/**
 * @description `admin-catalog-crud` domain (Phase 3b). Column set matches
 * `src/lib/db/schema.ts`'s `categories` table exactly — no join, no
 * projection, unlike munod's own richer `product_types`/`materials` graph
 * (this template's schema is deliberately flatter, design decision A4).
 */
export const CategorySchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		name: z.string().meta({ example: "Electronics" }),
		slug: z.string().meta({ example: "electronics" }),
		isActive: z.boolean().meta({ example: true }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
		updatedAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
	})
	.meta({
		id: "Category",
		description: "A product category.",
	});
export type Category = z.infer<typeof CategorySchema>;

/**
 * @description `slug` is derived server-side from `name` via `toSlug()`
 * (`src/lib/utils.ts`, already ported verbatim from munod in Phase 2) —
 * never client-supplied, matching munod's own real category-creation
 * convention (no `slug` field on its `NewCategory` shape either).
 */
export const CategoryCreateSchema = z
	.object({
		name: z.string().min(1).meta({ example: "Electronics" }),
	})
	.meta({
		id: "CategoryCreate",
		description: "Creates a category. `slug` is derived from `name`.",
	});
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;

export const CategoryUpdateSchema = z
	.object({
		name: z.string().min(1).optional().meta({ example: "Electronics" }),
		isActive: z.boolean().optional().meta({ example: true }),
	})
	.meta({
		id: "CategoryUpdate",
		description:
			"Updates a category. Renaming re-derives `slug` from the new `name`.",
	});
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
