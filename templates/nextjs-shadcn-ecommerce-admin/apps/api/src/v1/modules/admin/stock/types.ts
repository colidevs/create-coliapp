import { z } from "zod";

/**
 * @description `stock-management` domain, retargeted by
 * `sdd/ecommerce-product-variants/design`: `stock` is now a PROJECTION over
 * `product_variants` columns (design's own atomic-decrement requirement:
 * "keyed by `variant_id`") joined to its parent `products` row for
 * `name`/`slug`/`coverImage` — the sellable unit is the variant, not the
 * product. `id` is the VARIANT id. `variantLabel` is the joined,
 * human-readable option-value selection (e.g. `"Red / M"`), `null` for a
 * variant with zero option-value selections.
 */
export const StockItemSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		productId: z
			.uuid()
			.meta({ example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e" }),
		name: z.string().meta({ example: "Wireless Mouse" }),
		slug: z.string().meta({ example: "wireless-mouse" }),
		variantLabel: z.string().nullable().meta({ example: "Red / M" }),
		stock: z.number().int().meta({ example: 42 }),
		stockMin: z.number().int().meta({ example: 5 }),
		code: z.string().nullable().meta({ example: "WM-100-RED-M" }),
		altCode: z.string().nullable().meta({ example: "ALT-WM-100-RED-M" }),
		coverImage: z
			.url()
			.nullable()
			.meta({ example: "https://images.example.com/wireless-mouse.jpg" }),
	})
	.meta({
		id: "StockItem",
		description:
			"A variant's stock projection, with its parent product's name/slug and its resolved option-value label.",
	});
export type StockItem = z.infer<typeof StockItemSchema>;

export const StockUpdateSchema = z
	.object({
		stock: z.number().int().meta({ example: 42 }),
		stockMin: z.number().int().meta({ example: 5 }),
	})
	.meta({
		id: "StockUpdate",
		description: "Sets a product's stock and low-stock threshold.",
	});
export type StockUpdate = z.infer<typeof StockUpdateSchema>;

export interface GetStockParams {
	page?: number;
	size?: number;
}
