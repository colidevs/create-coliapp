import { z } from "zod";

/**
 * @description `variant-options` domain (`sdd/ecommerce-product-variants/
 * design`) — the sellable unit. Column set matches `src/lib/db/schema.ts`'s
 * `product_variants` table; `optionValueIds` is derived from the
 * `variant_option_selections` join, never a stored column on
 * `product_variants` itself (`./repository.ts` assembles it per read).
 * `price` is a Drizzle `numeric` column — the driver returns it as a
 * string; `toVariant()` (`./repository.ts`) converts it to a number before
 * it ever reaches this schema, same convention as `admin/products/types.ts`.
 */
export const VariantSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		productId: z
			.uuid()
			.meta({ example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e" }),
		code: z.string().nullable().meta({ example: "WM-100-RED-M" }),
		altCode: z.string().nullable().meta({ example: "ALT-WM-100-RED-M" }),
		price: z.number().meta({ example: 29.99 }),
		stock: z.number().int().meta({ example: 42 }),
		stockMin: z.number().int().meta({ example: 5 }),
		isDefault: z.boolean().meta({ example: true }),
		isActive: z.boolean().meta({ example: true }),
		displayOrder: z.number().int().meta({ example: 0 }),
		optionValueIds: z
			.array(z.uuid())
			.meta({ example: ["c1a2b3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"] }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
		updatedAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
	})
	.meta({
		id: "Variant",
		description:
			"A sellable variant of a product, with its option-value selections.",
	});
export type Variant = z.infer<typeof VariantSchema>;

/**
 * @description `optionValueIds` is the initial set of option-value
 * selections for this variant — a plain array, not a delta. `isDefault:
 * true` clears any other default variant of the same `productId` inside
 * the same transaction (design D7's partial unique index
 * `uq_product_variants_default` is the DB-enforced backstop; this is the
 * application-level swap that keeps the invariant meaningful instead of
 * just erroring). `stock`/`stockMin`/`displayOrder` default to `0` (schema
 * default) when omitted, same convention as `admin/products`.
 */
export const VariantCreateSchema = z
	.object({
		productId: z
			.uuid()
			.meta({ example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e" }),
		code: z.string().optional().meta({ example: "WM-100-RED-M" }),
		altCode: z.string().optional().meta({ example: "ALT-WM-100-RED-M" }),
		price: z.number().positive().meta({ example: 29.99 }),
		stock: z.number().int().optional().meta({ example: 42 }),
		stockMin: z.number().int().optional().meta({ example: 5 }),
		isDefault: z.boolean().optional().meta({ example: true }),
		displayOrder: z.number().int().optional().meta({ example: 0 }),
		optionValueIds: z
			.array(z.uuid())
			.optional()
			.meta({ example: ["c1a2b3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"] }),
	})
	.meta({
		id: "VariantCreate",
		description:
			"Creates a variant under a product, with its option-value selections.",
	});
export type VariantCreate = z.infer<typeof VariantCreateSchema>;

/**
 * @description `optionValueIds`, when present, REPLACES the variant's
 * entire selection set (delete-then-insert in one transaction) — never a
 * delta/merge. Omitting it leaves the current selections untouched, same
 * "only touch what's provided" convention every other `*UpdateSchema` in
 * this codebase already follows.
 */
export const VariantUpdateSchema = z
	.object({
		code: z.string().nullable().optional().meta({ example: "WM-100-RED-M" }),
		altCode: z
			.string()
			.nullable()
			.optional()
			.meta({ example: "ALT-WM-100-RED-M" }),
		price: z.number().positive().optional().meta({ example: 29.99 }),
		stock: z.number().int().optional().meta({ example: 42 }),
		stockMin: z.number().int().optional().meta({ example: 5 }),
		isDefault: z.boolean().optional().meta({ example: true }),
		isActive: z.boolean().optional().meta({ example: true }),
		displayOrder: z.number().int().optional().meta({ example: 0 }),
		optionValueIds: z
			.array(z.uuid())
			.optional()
			.meta({ example: ["c1a2b3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"] }),
	})
	.meta({
		id: "VariantUpdate",
		description:
			"Updates a variant. Providing `optionValueIds` replaces its entire selection set.",
	});
export type VariantUpdate = z.infer<typeof VariantUpdateSchema>;

/**
 * @description Same scoping shape as `admin/product-images`'s
 * `GetProductImagesParams` — `GET /?productId=` lists only the variants
 * belonging to that product; omitted, every variant across every product is
 * returned. Unpaginated, matching `admin/variant-option-values`'s own list
 * shape (no `Pagination` envelope).
 */
export interface GetVariantsParams {
	productId?: string;
}
