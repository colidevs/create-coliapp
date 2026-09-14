import { z } from "zod";

/**
 * @description `variant-options` domain (`sdd/ecommerce-product-variants/
 * design`). Column set matches `src/lib/db/schema.ts`'s `variant_option_types`
 * table exactly — the admin-managed option-type vocabulary (e.g. "color",
 * "size"). A new option type is usable by variants with zero schema
 * migration and zero code edit (spec requirement).
 */
export const VariantOptionTypeSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		name: z.string().meta({ example: "Color" }),
		slug: z.string().meta({ example: "color" }),
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
		id: "VariantOptionType",
		description: "An admin-managed variant option type (e.g. color, size).",
	});
export type VariantOptionType = z.infer<typeof VariantOptionTypeSchema>;

/**
 * @description `slug` is derived server-side from `name` via `toSlug()`
 * (`src/lib/utils.ts`) — never client-supplied, matching this template's
 * existing `admin/categories` create convention.
 */
export const VariantOptionTypeCreateSchema = z
	.object({
		name: z.string().min(1).meta({ example: "Color" }),
		displayOrder: z.number().int().optional().meta({ example: 0 }),
	})
	.meta({
		id: "VariantOptionTypeCreate",
		description:
			"Creates a variant option type. `slug` is derived from `name`.",
	});
export type VariantOptionTypeCreate = z.infer<
	typeof VariantOptionTypeCreateSchema
>;

export const VariantOptionTypeUpdateSchema = z
	.object({
		name: z.string().min(1).optional().meta({ example: "Color" }),
		displayOrder: z.number().int().optional().meta({ example: 0 }),
		isActive: z.boolean().optional().meta({ example: true }),
	})
	.meta({
		id: "VariantOptionTypeUpdate",
		description:
			"Updates a variant option type. Renaming re-derives `slug` from the new `name`.",
	});
export type VariantOptionTypeUpdate = z.infer<
	typeof VariantOptionTypeUpdateSchema
>;
