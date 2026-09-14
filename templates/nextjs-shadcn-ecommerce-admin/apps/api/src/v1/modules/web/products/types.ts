import { z } from "zod";
import { PaginationSchema } from "@/v1/types";

/**
 * @description `variant-options` domain (`sdd/ecommerce-product-variants/
 * design`) — public storefront read shape. Unlike `admin/products`'s
 * `ProductSchema` (parent metadata + derived `defaultPrice`/`variantCount`),
 * the storefront needs every ACTIVE variant nested with its resolved
 * option-value selections, so a shopper can select options and resolve a
 * price/stock client-side (`variant-selector.tsx`'s `resolveVariant`,
 * Phase 7) without a second round-trip. A dedicated schema, not a reuse of
 * `admin/products`'s `ProductSchema` — the two shapes have diverged since
 * the variants move.
 */
export const PublicVariantOptionSchema = z
	.object({
		optionTypeSlug: z.string().meta({ example: "color" }),
		optionTypeName: z.string().meta({ example: "Color" }),
		valueSlug: z.string().meta({ example: "red" }),
		value: z.string().meta({ example: "Red" }),
		imageUrl: z
			.url()
			.nullable()
			.meta({ example: "https://images.example.com/red-swatch.jpg" }),
		description: z.string().nullable().meta({ example: "Fire-engine red." }),
	})
	.meta({
		id: "PublicVariantOption",
		description: "A resolved option-value selection on a storefront variant.",
	});
export type PublicVariantOption = z.infer<typeof PublicVariantOptionSchema>;

export const PublicVariantSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		price: z.number().meta({ example: 29.99 }),
		stock: z.number().int().meta({ example: 42 }),
		isDefault: z.boolean().meta({ example: true }),
		options: z.array(PublicVariantOptionSchema),
	})
	.meta({
		id: "PublicVariant",
		description:
			"An active, sellable variant, with its resolved option-value selections.",
	});
export type PublicVariant = z.infer<typeof PublicVariantSchema>;

export const PublicProductSchema = z
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
		variants: z.array(PublicVariantSchema),
	})
	.meta({
		id: "PublicProduct",
		description:
			"A storefront-facing product, with its active variants and their option-value selections.",
	});
export type PublicProduct = z.infer<typeof PublicProductSchema>;

export const PublicProductListSchema = z
	.object({
		items: z.array(PublicProductSchema),
		pagination: PaginationSchema,
	})
	.meta({
		id: "PublicProductList",
		description: "A page of active storefront products.",
	});
export type PublicProductList = z.infer<typeof PublicProductListSchema>;

export interface GetPublicProductsParams {
	page?: number;
	size?: number;
	categoryId?: string;
	q?: string;
}
