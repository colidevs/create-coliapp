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
 * Client-side validation schema for `form.tsx` (`@tanstack/react-form`,
 * per-field `validators.onChange` — `colidevs/hefesto#104`). `productId` is
 * required only on create (`VariantForm`'s own required prop, not this
 * shared schema) — mirrors `modules/product-images/types.ts`/`modules/
 * variant-option-values/types.ts`'s own scoped-by-parent-id convention.
 * `optionValueIds` is a plain array (never a delta) — matching `apps/api`'s
 * own `VariantCreateSchema`/`VariantUpdateSchema` (`admin/variants/types.ts`):
 * "providing `optionValueIds` replaces its entire selection set".
 */
export const variantFormSchema = z.object({
	productId: z.uuid("Must be a valid product ID"),
	code: z.string().optional(),
	altCode: z.string().optional(),
	// Plain `z.number()`, not `z.coerce.number()` — same reasoning as every
	// other numeric field in this admin surface (`modules/products/types.ts`'s
	// own note): keeps input/output types identical under ADR 0030's
	// `exactOptionalPropertyTypes` floor. Numeric `<Input>`s convert via the
	// native `event.target.valueAsNumber` instead.
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
/**
 * Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11) — client
 * mirror of `apps/api`'s `admin/variants/repository.ts#
 * resolveEstablishedOptionTypeIds`. This schema has no `product_option_types`
 * table (`variant_option_types` is global vocabulary shared across every
 * product), so the only source of "which option types does THIS product
 * use" is what its OTHER active variants already selected. Returns an empty
 * array for a brand-new product or a genuinely option-less single-SKU
 * product — `computeMissingRequiredOptionTypes` below treats that as "no
 * constraint yet", matching `admin/variants/repository.ts#replaceSelections`'s
 * own documented allowance. Advisory only (immediate UX feedback) — the real
 * enforcement is server-side.
 */
export function computeRequiredOptionTypeIds(
	siblingVariants: Variant[],
	optionValues: VariantOptionValue[],
	excludeVariantId?: string,
): string[] {
	const typeIdByValueId = new Map(
		optionValues.map((value) => [value.id, value.optionTypeId]),
	);
	const typeIds = new Set<string>();

	for (const variant of siblingVariants) {
		if (!variant.isActive) continue;
		if (excludeVariantId && variant.id === excludeVariantId) continue;
		for (const valueId of variant.optionValueIds) {
			const typeId = typeIdByValueId.get(valueId);
			if (typeId) typeIds.add(typeId);
		}
	}

	return [...typeIds];
}

/**
 * Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11) — pairs
 * with `computeRequiredOptionTypeIds` above: given the product's own
 * established option-type set and THIS variant's currently-selected
 * `optionValueIds`, returns the required type IDs that don't have EXACTLY
 * one selected value (missing entirely, or more than one for the same
 * type). An empty result means the current selection satisfies the
 * product's established option types (or none are established yet).
 */
export function computeMissingRequiredOptionTypes(
	requiredOptionTypeIds: string[],
	optionValueIds: string[],
	optionValues: VariantOptionValue[],
): string[] {
	if (requiredOptionTypeIds.length === 0) return [];

	const typeIdByValueId = new Map(
		optionValues.map((value) => [value.id, value.optionTypeId]),
	);
	const countByType = new Map<string, number>();
	for (const valueId of optionValueIds) {
		const typeId = typeIdByValueId.get(valueId);
		if (typeId) countByType.set(typeId, (countByType.get(typeId) ?? 0) + 1);
	}

	return requiredOptionTypeIds.filter(
		(typeId) => (countByType.get(typeId) ?? 0) !== 1,
	);
}

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
