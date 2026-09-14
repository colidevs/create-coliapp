import { z } from "zod";

/**
 * @description `variant-options` domain (`sdd/ecommerce-product-variants/
 * design`). Column set matches `src/lib/db/schema.ts`'s `variant_option_values`
 * table exactly — the concrete values of an option type (e.g. `color`'s
 * `red`/`blue`). `slug` is unique per `(optionTypeId, slug)`, not globally
 * unique — two different option types may each have a value slugged `m`
 * (spec requirement).
 */
export const VariantOptionValueSchema = z
	.object({
		id: z.uuid().meta({ example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e" }),
		optionTypeId: z
			.uuid()
			.meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		value: z.string().meta({ example: "Red" }),
		slug: z.string().meta({ example: "red" }),
		imageUrl: z
			.url()
			.nullable()
			.meta({ example: "https://images.example.com/red-swatch.jpg" }),
		description: z.string().nullable().meta({ example: "Fire-engine red." }),
		displayOrder: z.number().int().meta({ example: 0 }),
		isActive: z.boolean().meta({ example: true }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
		updatedAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
	})
	.meta({
		id: "VariantOptionValue",
		description: "An admin-managed value of a variant option type.",
	});
export type VariantOptionValue = z.infer<typeof VariantOptionValueSchema>;

/**
 * @description `slug` is derived server-side from `value` via `toSlug()`
 * (`src/lib/utils.ts`) — never client-supplied, matching this template's
 * existing `admin/categories`/`admin/variant-option-types` create
 * convention. `optionTypeId` is mandatory — a value cannot exist without
 * its parent option type, same shape as `admin/product-images`'s mandatory
 * `productId` on create.
 */
export const VariantOptionValueCreateSchema = z
	.object({
		optionTypeId: z
			.uuid()
			.meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		value: z.string().min(1).meta({ example: "Red" }),
		imageUrl: z
			.url()
			.optional()
			.meta({ example: "https://images.example.com/red-swatch.jpg" }),
		description: z.string().optional().meta({ example: "Fire-engine red." }),
		displayOrder: z.number().int().optional().meta({ example: 0 }),
	})
	.meta({
		id: "VariantOptionValueCreate",
		description:
			"Creates a variant option value. `slug` is derived from `value`.",
	});
export type VariantOptionValueCreate = z.infer<
	typeof VariantOptionValueCreateSchema
>;

export const VariantOptionValueUpdateSchema = z
	.object({
		value: z.string().min(1).optional().meta({ example: "Red" }),
		imageUrl: z
			.url()
			.nullable()
			.optional()
			.meta({ example: "https://images.example.com/red-swatch.jpg" }),
		description: z
			.string()
			.nullable()
			.optional()
			.meta({ example: "Fire-engine red." }),
		displayOrder: z.number().int().optional().meta({ example: 0 }),
		isActive: z.boolean().optional().meta({ example: true }),
	})
	.meta({
		id: "VariantOptionValueUpdate",
		description:
			"Updates a variant option value. Renaming `value` re-derives `slug`.",
	});
export type VariantOptionValueUpdate = z.infer<
	typeof VariantOptionValueUpdateSchema
>;

/**
 * @description Same scoping shape as `admin/product-images`'s
 * `GetProductImagesParams` — `GET /?optionTypeId=` lists only the values
 * belonging to that option type; omitted, every value across every option
 * type is returned.
 */
export interface GetVariantOptionValuesParams {
	optionTypeId?: string;
}
