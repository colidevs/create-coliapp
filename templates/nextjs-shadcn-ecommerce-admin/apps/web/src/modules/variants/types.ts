import { z } from "zod";

import type {
	ListVariantsParams,
	Variant,
	VariantCreate,
	VariantOptionType,
	VariantOptionValue,
	VariantUpdate,
} from "@/generated/model";

export type { ListVariantsParams, Variant, VariantCreate, VariantUpdate };

/**
 * Client-side validation schema for `form.tsx`. `productId` is required only
 * on create (`VariantForm`'s own required prop, not this shared schema) —
 * mirrors `modules/product-images/types.ts`/`modules/variant-option-values/
 * types.ts`'s own scoped-by-parent-id convention. `optionValueIds` is a
 * plain array (never a delta) — matching `apps/api`'s own
 * `VariantCreateSchema`/`VariantUpdateSchema` (`admin/variants/types.ts`):
 * "providing `optionValueIds` replaces its entire selection set".
 */
export const variantFormSchema = z.object({
	productId: z.uuid("Must be a valid product ID"),
	code: z.string().optional(),
	altCode: z.string().optional(),
	// Plain `z.number()`, not `z.coerce.number()` — same reasoning as every
	// other numeric field in this admin surface (`modules/products/types.ts`'s
	// own note): keeps input/output types identical under ADR 0030's
	// `exactOptionalPropertyTypes` floor. Numeric `<Input>`s register with
	// RHF's own `valueAsNumber: true` instead.
	price: z.number().positive("Price must be greater than 0"),
	stock: z.number().int().optional(),
	stockMin: z.number().int().optional(),
	isDefault: z.boolean(),
	isActive: z.boolean(),
	displayOrder: z.number().int().optional(),
	optionValueIds: z.array(z.uuid()),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;

/**
 * Resolves a variant's selected option values into human-readable
 * `"OptionType: Value"` labels, sorted by `variant_option_types.display_order`
 * then `variant_option_values.display_order` — the SAME join order confirmed
 * for `admin/stock` (PR5), reused unchanged in `Dlocal/repository.ts#loadVariantLabels`
 * (PR6) and `variant-selection.ts#formatVariantLabel` (PR7, storefront side).
 * This is the admin-side equivalent, used by the variants table/detail views
 * to display a variant's selections without a server-side join — the admin
 * `Variant` model only carries raw `optionValueIds`, never resolved labels.
 */
export function resolveVariantOptionLabels(
	variant: Pick<Variant, "optionValueIds">,
	optionTypes: VariantOptionType[],
	optionValues: VariantOptionValue[],
): string[] {
	const valuesById = new Map(optionValues.map((value) => [value.id, value]));
	const typesById = new Map(optionTypes.map((type) => [type.id, type]));

	return variant.optionValueIds
		.map((id) => valuesById.get(id))
		.filter((value): value is VariantOptionValue => value !== undefined)
		.map((value) => ({ value, type: typesById.get(value.optionTypeId) }))
		.sort((a, b) => {
			const typeOrder =
				(a.type?.displayOrder ?? 0) - (b.type?.displayOrder ?? 0);
			if (typeOrder !== 0) return typeOrder;
			return a.value.displayOrder - b.value.displayOrder;
		})
		.map(({ type, value }) => `${type?.name ?? "Option"}: ${value.value}`);
}
