/**
 * In-memory `variant-option-types`/`variant-option-values` MSW fixture,
 * matching this template's ACTUAL generated `VariantOptionType`/
 * `VariantOptionValue` shapes (`@/generated/model`).
 *
 * PR8 seeded both collections EMPTY, deliberately deferring real fixture
 * data to this task (9.3). Real, deterministic (unprefixed UUID) seed data
 * now exists so `variants.ts`'s own variant fixtures can reference genuine
 * option-value selections, and so the admin variants form's option-value
 * picker (`modules/variants/form.tsx`) has something to render out of the
 * box under MSW.
 */
export interface VariantOptionTypeRecord {
	id: string;
	name: string;
	slug: string;
	displayOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface VariantOptionValueRecord {
	id: string;
	optionTypeId: string;
	value: string;
	slug: string;
	imageUrl: string | null;
	description: string | null;
	displayOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

const NOW = "2026-09-01T00:00:00.000Z";

export const FINISH_OPTION_TYPE_ID = "00000000-0000-4000-8000-0000000000f1";
export const SIZE_OPTION_TYPE_ID = "00000000-0000-4000-8000-0000000000f2";

export const NATURAL_VALUE_ID = "00000000-0000-4000-8000-0000000000a1";
export const WALNUT_VALUE_ID = "00000000-0000-4000-8000-0000000000a2";

export function defaultVariantOptionTypeSeed(): VariantOptionTypeRecord[] {
	return [
		{
			id: FINISH_OPTION_TYPE_ID,
			name: "Finish",
			slug: "finish",
			displayOrder: 0,
			isActive: true,
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: SIZE_OPTION_TYPE_ID,
			name: "Size",
			slug: "size",
			displayOrder: 1,
			isActive: true,
			createdAt: NOW,
			updatedAt: NOW,
		},
	];
}

export function defaultVariantOptionValueSeed(): VariantOptionValueRecord[] {
	return [
		{
			id: NATURAL_VALUE_ID,
			optionTypeId: FINISH_OPTION_TYPE_ID,
			value: "Natural",
			slug: "natural",
			imageUrl: null,
			description: null,
			displayOrder: 0,
			isActive: true,
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: WALNUT_VALUE_ID,
			optionTypeId: FINISH_OPTION_TYPE_ID,
			value: "Walnut",
			slug: "walnut",
			imageUrl: null,
			description: null,
			displayOrder: 1,
			isActive: true,
			createdAt: NOW,
			updatedAt: NOW,
		},
	];
}

export const variantOptionTypesFixture: VariantOptionTypeRecord[] =
	defaultVariantOptionTypeSeed();
export const variantOptionValuesFixture: VariantOptionValueRecord[] =
	defaultVariantOptionValueSeed();
