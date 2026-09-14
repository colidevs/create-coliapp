import { z } from "zod";
import { PaginationSchema } from "@/v1/types";

/**
 * @description `admin-catalog-crud` domain, retargeted by
 * `sdd/ecommerce-product-variants/design` (D3/D4): `products` is now parent
 * catalog metadata only — every sellable attribute (`code`/`altCode`/
 * `price`/`stock`/`stockMin`) moved to `product_variants`
 * (`admin/variants/types.ts`). `defaultPrice`/`variantCount` are derived,
 * read-only fields, never stored columns — `toProduct()` (`./repository.ts`)
 * computes them at read time from the product's variants (design D4: "no
 * stored rollup price/stock column MUST exist on `products`").
 */
export const ProductSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		name: z.string().meta({ example: "Wireless Mouse" }),
		slug: z.string().meta({ example: "wireless-mouse" }),
		description: z
			.string()
			.nullable()
			.meta({ example: "Ergonomic wireless mouse." }),
		coverImage: z
			.url()
			.nullable()
			.meta({ example: "https://images.example.com/wireless-mouse.jpg" }),
		categoryId: z
			.uuid()
			.nullable()
			.meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		isActive: z.boolean().meta({ example: true }),
		/**
		 * @description The `is_default` variant's price, or `null` when the
		 * product has no variants yet (e.g. a freshly created draft, D3).
		 */
		defaultPrice: z.number().nullable().meta({ example: 29.99 }),
		/** @description Total variant count, regardless of `isActive`. */
		variantCount: z.number().int().meta({ example: 2 }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
		updatedAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
	})
	.meta({
		id: "Product",
		description:
			"A catalog product, with its derived default-variant price and variant count.",
	});
export type Product = z.infer<typeof ProductSchema>;

/**
 * @description `slug` is derived server-side from `name` via `toSlug()`
 * (`src/lib/utils.ts`) — never client-supplied, same convention as
 * `admin/categories`. No `price`/`stock`/`isActive` here — design D3: a
 * product is always created as a draft (`is_active: false`, the schema
 * default). Publishing (`isActive: true`, via `PATCH`) requires at least
 * one active variant — add one via `POST /admin/variants` first.
 */
export const ProductCreateSchema = z
	.object({
		name: z.string().min(1).meta({ example: "Wireless Mouse" }),
		description: z
			.string()
			.optional()
			.meta({ example: "Ergonomic wireless mouse." }),
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
		description:
			"Creates a product as a draft (`isActive: false`). `slug` is derived from `name`.",
	});
export type ProductCreate = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = z
	.object({
		name: z.string().min(1).optional().meta({ example: "Wireless Mouse" }),
		description: z
			.string()
			.nullable()
			.optional()
			.meta({ example: "Ergonomic wireless mouse." }),
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
		/**
		 * @description Setting `true` with zero active variants is rejected —
		 * the deferrable constraint trigger `trg_product_requires_active_variant`
		 * (`drizzle/0005_variant_rls_and_invariants.sql`) raises `23514` at
		 * COMMIT, mapped to `ProductRequiresActiveVariantHttpError` (422).
		 */
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
