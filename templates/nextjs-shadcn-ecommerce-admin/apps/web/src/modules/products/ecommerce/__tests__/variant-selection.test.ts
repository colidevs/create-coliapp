import { describe, expect, it } from "vitest";

import type { PublicVariant } from "@/modules/products/types";
import {
	formatVariantLabel,
	groupVariantOptions,
	initialSelectedOptions,
	resolveDefaultVariant,
	resolveVariant,
} from "../variant-selection";

function makeVariant(overrides: Partial<PublicVariant> = {}): PublicVariant {
	return {
		id: "variant-1",
		price: 100,
		stock: 5,
		isDefault: false,
		options: [],
		...overrides,
	};
}

const redSmall = makeVariant({
	id: "red-s",
	price: 19.99,
	stock: 3,
	isDefault: true,
	options: [
		{
			optionTypeSlug: "color",
			optionTypeName: "Color",
			valueSlug: "red",
			value: "Red",
			imageUrl: null,
			description: null,
		},
		{
			optionTypeSlug: "size",
			optionTypeName: "Size",
			valueSlug: "s",
			value: "S",
			imageUrl: null,
			description: null,
		},
	],
});

const redLarge = makeVariant({
	id: "red-l",
	price: 21.99,
	stock: 0,
	options: [
		{
			optionTypeSlug: "color",
			optionTypeName: "Color",
			valueSlug: "red",
			value: "Red",
			imageUrl: null,
			description: null,
		},
		{
			optionTypeSlug: "size",
			optionTypeName: "Size",
			valueSlug: "l",
			value: "L",
			imageUrl: null,
			description: null,
		},
	],
});

const blueSmall = makeVariant({
	id: "blue-s",
	price: 19.99,
	stock: 8,
	options: [
		{
			optionTypeSlug: "color",
			optionTypeName: "Color",
			valueSlug: "blue",
			value: "Blue",
			imageUrl: "https://images.example.com/blue-swatch.jpg",
			description: "A calm blue.",
		},
		{
			optionTypeSlug: "size",
			optionTypeName: "Size",
			valueSlug: "s",
			value: "S",
			imageUrl: null,
			description: null,
		},
	],
});

const variants = [redSmall, redLarge, blueSmall];

describe("groupVariantOptions", () => {
	it("groups values by optionTypeSlug, deduping by valueSlug", () => {
		const groups = groupVariantOptions(variants);

		expect(groups).toEqual([
			{
				optionTypeSlug: "color",
				optionTypeName: "Color",
				values: [
					{
						valueSlug: "red",
						value: "Red",
						imageUrl: null,
						description: null,
					},
					{
						valueSlug: "blue",
						value: "Blue",
						imageUrl: "https://images.example.com/blue-swatch.jpg",
						description: "A calm blue.",
					},
				],
			},
			{
				optionTypeSlug: "size",
				optionTypeName: "Size",
				values: [
					{ valueSlug: "s", value: "S", imageUrl: null, description: null },
					{ valueSlug: "l", value: "L", imageUrl: null, description: null },
				],
			},
		]);
	});

	it("returns no groups for a single default variant with zero option selections", () => {
		expect(groupVariantOptions([makeVariant({ isDefault: true })])).toEqual([]);
	});
});

describe("initialSelectedOptions", () => {
	it("seeds one entry per option type on the given variant", () => {
		expect(initialSelectedOptions(redSmall)).toEqual({
			color: "red",
			size: "s",
		});
	});

	it("returns an empty selection when no variant is given", () => {
		expect(initialSelectedOptions(undefined)).toEqual({});
	});
});

describe("resolveVariant", () => {
	it("resolves the unique variant matching every selected option", () => {
		expect(resolveVariant(variants, { color: "blue", size: "s" })).toBe(
			blueSmall,
		);
	});

	it("resolves the variant matching a single selected option type", () => {
		// Not a unique match (red-s and red-l both satisfy color=red) —
		// `.find()` returns the first one, mirroring munod's own semantics.
		expect(resolveVariant(variants, { color: "red" })).toBe(redSmall);
	});

	it("falls back when no variant matches every selected option", () => {
		expect(resolveVariant(variants, { color: "green" }, redSmall)).toBe(
			redSmall,
		);
	});

	it("returns undefined with no match and no fallback", () => {
		expect(resolveVariant(variants, { color: "green" })).toBeUndefined();
	});

	/**
	 * Bug fix regression (`sdd/ecommerce-product-variants/apply-progress`
	 * PR11): the pure `resolveVariant` predicate itself already returned
	 * `undefined` correctly for a no-match selection (the test above) — the
	 * REAL bug was `variant-selector.tsx`'s call site always passing
	 * `defaultVariant` as a live `fallback`, silently substituting the wrong
	 * variant instead of surfacing "no match". This test pins the exact
	 * multi-option-type impossible-combination shape from that bug report
	 * (color+size both selected, matching no real variant, blue/l doesn't
	 * exist among `red-s`/`red-l`/`blue-s`) — asserting `resolveVariant`
	 * never falls back to ANY variant, including the default, when called
	 * with no `fallback` argument, exactly as the fixed call site now does.
	 */
	it("returns undefined for an impossible multi-option-type combination, never the default variant", () => {
		expect(
			resolveVariant(variants, { color: "blue", size: "l" }),
		).toBeUndefined();
	});

	it("matches the first variant when nothing is selected", () => {
		expect(resolveVariant(variants, {})).toBe(redSmall);
	});
});

describe("resolveDefaultVariant", () => {
	it("returns the variant flagged isDefault", () => {
		expect(resolveDefaultVariant({ variants })).toBe(redSmall);
	});

	it("falls back to the first variant when none is flagged default", () => {
		const noDefault = [redLarge, blueSmall];
		expect(resolveDefaultVariant({ variants: noDefault })).toBe(redLarge);
	});

	it("returns undefined for a product with zero variants", () => {
		expect(resolveDefaultVariant({ variants: [] })).toBeUndefined();
	});
});

describe("formatVariantLabel", () => {
	it('joins option values in array order with " / "', () => {
		expect(formatVariantLabel(redSmall)).toBe("Red / S");
	});

	it("returns null for a variant with zero option selections", () => {
		expect(formatVariantLabel(makeVariant())).toBeNull();
	});
});
