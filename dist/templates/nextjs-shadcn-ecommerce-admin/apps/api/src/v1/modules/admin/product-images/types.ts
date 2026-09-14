import { z } from "zod";

/**
 * @description `admin-catalog-crud` domain (Phase 3b). Column set matches
 * `src/lib/db/schema.ts`'s `product_images` table exactly. No `isActive`
 * column exists on this table (unlike `categories`/`products`) — deletion
 * is a HARD delete here (`./repository.ts`), a documented deviation from
 * munod's own `product_media` soft-delete convention, since this template's
 * schema simply has no soft-delete column to set.
 */
export const ProductImageSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		productId: z
			.uuid()
			.meta({ example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e" }),
		url: z
			.url()
			.meta({ example: "https://images.example.com/wireless-mouse-1.jpg" }),
		position: z.number().int().meta({ example: 0 }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
	})
	.meta({
		id: "ProductImage",
		description: "A gallery image belonging to a product.",
	});
export type ProductImage = z.infer<typeof ProductImageSchema>;

/**
 * @description Not one of this Phase's `.meta()`-registered top-level
 * schemas — used only as an inline request-body schema in
 * `scripts/generate-openapi.ts`, never as a named OpenAPI component.
 */
export const ProductImageCreateSchema = z.object({
	productId: z.uuid().meta({ example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e" }),
	url: z
		.url()
		.meta({ example: "https://images.example.com/wireless-mouse-1.jpg" }),
	position: z.number().int().optional().meta({ example: 0 }),
});
export type ProductImageCreate = z.infer<typeof ProductImageCreateSchema>;

export const ProductImageUpdateSchema = z.object({
	url: z
		.url()
		.optional()
		.meta({ example: "https://images.example.com/wireless-mouse-1.jpg" }),
	position: z.number().int().optional().meta({ example: 0 }),
});
export type ProductImageUpdate = z.infer<typeof ProductImageUpdateSchema>;

export interface GetProductImagesParams {
	productId?: string;
}
