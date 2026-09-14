import { z } from "zod";
import { PaginationSchema } from "@/v1/types";

/**
 * @description `admin-catalog-crud` / `stock-management` domains (Phase 3b).
 * Column set matches `src/lib/db/schema.ts`'s `products` table exactly.
 * `price` is a Drizzle `numeric` column — the driver returns it as a
 * string; `toProduct()` (`./repository.ts`) is what converts it to a
 * number before it ever reaches this schema.
 */
export const ProductSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		name: z.string().meta({ example: "Wireless Mouse" }),
		slug: z.string().meta({ example: "wireless-mouse" }),
		code: z.string().nullable().meta({ example: "WM-100" }),
		altCode: z.string().nullable().meta({ example: "ALT-WM-100" }),
		description: z
			.string()
			.nullable()
			.meta({ example: "Ergonomic wireless mouse." }),
		price: z.number().meta({ example: 29.99 }),
		stock: z.number().int().meta({ example: 42 }),
		stockMin: z.number().int().meta({ example: 5 }),
		coverImage: z
			.url()
			.nullable()
			.meta({ example: "https://images.example.com/wireless-mouse.jpg" }),
		categoryId: z
			.uuid()
			.nullable()
			.meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		isActive: z.boolean().meta({ example: true }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
		updatedAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
	})
	.meta({
		id: "Product",
		description: "A catalog product.",
	});
export type Product = z.infer<typeof ProductSchema>;

/**
 * @description `slug` is derived server-side from `name` via `toSlug()`
 * (`src/lib/utils.ts`) — never client-supplied, same convention as
 * `admin/categories`. `stock`/`stockMin` default to `0` (schema default,
 * `src/lib/db/schema.ts`) when omitted.
 */
export const ProductCreateSchema = z
	.object({
		name: z.string().min(1).meta({ example: "Wireless Mouse" }),
		code: z.string().optional().meta({ example: "WM-100" }),
		altCode: z.string().optional().meta({ example: "ALT-WM-100" }),
		description: z
			.string()
			.optional()
			.meta({ example: "Ergonomic wireless mouse." }),
		price: z.number().positive().meta({ example: 29.99 }),
		stock: z.number().int().optional().meta({ example: 42 }),
		stockMin: z.number().int().optional().meta({ example: 5 }),
		coverImage: z
			.url()
			.optional()
			.meta({ example: "https://images.example.com/wireless-mouse.jpg" }),
		categoryId: z
			.uuid()
			.optional()
			.meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
	})
	.meta({
		id: "ProductCreate",
		description: "Creates a product. `slug` is derived from `name`.",
	});
export type ProductCreate = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = z
	.object({
		name: z.string().min(1).optional().meta({ example: "Wireless Mouse" }),
		code: z.string().nullable().optional().meta({ example: "WM-100" }),
		altCode: z.string().nullable().optional().meta({ example: "ALT-WM-100" }),
		description: z
			.string()
			.nullable()
			.optional()
			.meta({ example: "Ergonomic wireless mouse." }),
		price: z.number().positive().optional().meta({ example: 29.99 }),
		stock: z.number().int().optional().meta({ example: 42 }),
		stockMin: z.number().int().optional().meta({ example: 5 }),
		coverImage: z
			.url()
			.nullable()
			.optional()
			.meta({ example: "https://images.example.com/wireless-mouse.jpg" }),
		categoryId: z
			.uuid()
			.nullable()
			.optional()
			.meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		isActive: z.boolean().optional().meta({ example: true }),
	})
	.meta({
		id: "ProductUpdate",
		description:
			"Updates a product. Renaming re-derives `slug` from the new `name`.",
	});
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

export const ProductListSchema = z
	.object({
		items: z.array(ProductSchema),
		pagination: PaginationSchema,
	})
	.meta({
		id: "ProductList",
		description: "A page of products.",
	});
export type ProductList = z.infer<typeof ProductListSchema>;

export interface GetProductsParams {
	page?: number;
	size?: number;
	categoryId?: string;
	q?: string;
}
