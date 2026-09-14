import type { PublicProduct, PublicVariant } from "@/modules/products/types";

/**
 * PORT of munod's real
 * `modules/products/ecommerce/variant-selection.ts:14-72` — the every/some
 * predicate matcher (`sdd/ecommerce-product-variants/design`, Phase 7). Only
 * rename: munod's snake_case `option_type_slug`/`value_slug` wire fields
 * become this template's camelCase `PublicVariantOption` contract
 * (`optionTypeSlug`/`valueSlug`, already camelCase at the API boundary per
 * `apps/api`'s `PublicVariantOptionSchema` — no local rename glue needed).
 * The matching logic itself (`groupVariantOptions`'s dedupe-by-`valueSlug`
 * `Map`, `resolveVariant`'s `entries.every(...variant.options.some(...))`
 * predicate) is otherwise byte-identical in shape to munod's version — never
 * slug concatenation.
 */
export type VariantOptionGroup = {
	optionTypeSlug: string;
	optionTypeName: string;
	values: {
		valueSlug: string;
		value: string;
		imageUrl: string | null;
		description: string | null;
	}[];
};

export function groupVariantOptions(
	variants: PublicVariant[],
): VariantOptionGroup[] {
	const groups = new Map<string, VariantOptionGroup>();

	for (const variant of variants) {
		for (const option of variant.options) {
			let group = groups.get(option.optionTypeSlug);
			if (!group) {
				group = {
					optionTypeSlug: option.optionTypeSlug,
					optionTypeName: option.optionTypeName,
					values: [],
				};
				groups.set(option.optionTypeSlug, group);
			}
			if (!group.values.some((v) => v.valueSlug === option.valueSlug)) {
				group.values.push({
					valueSlug: option.valueSlug,
					value: option.value,
					imageUrl: option.imageUrl,
					description: option.description,
				});
			}
		}
	}

	return Array.from(groups.values());
}

export type SelectedVariantOptions = Record<string, string>;

export function initialSelectedOptions(
	variant: PublicVariant | undefined,
): SelectedVariantOptions {
	if (!variant) return {};
	return Object.fromEntries(
		variant.options.map((o) => [o.optionTypeSlug, o.valueSlug]),
	);
}

export function resolveVariant(
	variants: PublicVariant[],
	selected: SelectedVariantOptions,
	fallback?: PublicVariant,
): PublicVariant | undefined {
	const entries = Object.entries(selected);

	const match = variants.find((variant) =>
		entries.every(([optionTypeSlug, valueSlug]) =>
			variant.options.some(
				(o) => o.optionTypeSlug === optionTypeSlug && o.valueSlug === valueSlug,
			),
		),
	);

	return match ?? fallback;
}

/**
 * NOT part of munod's original module — `EcomProductSchema` carries a
 * separate `defaultVariant` field munod's storefront reads directly; this
 * template's `PublicProductSchema` has no such field (`apps/api`'s
 * `web/products/types.ts`), only `variants[]`. This small, added helper
 * derives the same "the variant to show/select before the buyer picks
 * anything" concept from the `isDefault` flag every variant already carries.
 */
export function resolveDefaultVariant(
	product: Pick<PublicProduct, "variants">,
): PublicVariant | undefined {
	return product.variants.find((v) => v.isDefault) ?? product.variants[0];
}

/**
 * Composes the same human-readable "Red / L" label
 * `admin/stock/repository.ts` and `Dlocal/repository.ts`'s own
 * `loadVariantLabels()` compute server-side (option-type `displayOrder` then
 * option-value `displayOrder`, `" / "`-joined) — but client-side, off the
 * storefront's own `PublicVariant.options[]`. No local re-sort is needed:
 * `apps/api`'s `web/products/repository.ts#loadActiveVariantsByProductId`
 * already emits `options[]` pre-ordered by that same
 * `variant_option_types.display_order`/`variant_option_values.display_order`
 * convention (its own query `.orderBy(...)`), so the public contract simply
 * has no separate `displayOrder` field to re-derive the order from — the
 * array order already IS the order. Returns `null` for a variant with zero
 * option selections, matching the server-side convention's own "null when
 * no selections" case.
 */
export function formatVariantLabel(variant: PublicVariant): string | null {
	if (variant.options.length === 0) return null;
	return variant.options.map((o) => o.value).join(" / ");
}
