import { z } from "zod";

/**
 * @description `stock-management` domain (Phase 3b). `stock` is a
 * PROJECTION over `products` columns (design decision A4,
 * `sdd/ecommerce-admin-template/design`) — no separate `stock` table
 * exists. Matches munod's real `StockSchema`
 * (`stock/repository.ts:33-37`) minus the join-derived fields this
 * template's flatter schema doesn't have.
 */
export const StockItemSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		name: z.string().meta({ example: "Wireless Mouse" }),
		slug: z.string().meta({ example: "wireless-mouse" }),
		stock: z.number().int().meta({ example: 42 }),
		stockMin: z.number().int().meta({ example: 5 }),
		code: z.string().nullable().meta({ example: "WM-100" }),
		altCode: z.string().nullable().meta({ example: "ALT-WM-100" }),
		coverImage: z
			.url()
			.nullable()
			.meta({ example: "https://images.example.com/wireless-mouse.jpg" }),
	})
	.meta({
		id: "StockItem",
		description: "A product's stock projection.",
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
