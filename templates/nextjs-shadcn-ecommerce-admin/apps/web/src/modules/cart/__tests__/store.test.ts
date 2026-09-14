import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicProduct, PublicVariant } from "@/modules/products/types";

/**
 * `useCartStore` (`../store.ts`) is a Zustand `persist` store backed by
 * `localStorage` — a browser-only global Vitest's `node` environment does
 * not provide (confirmed: Node has no global `localStorage` even on
 * current LTS). A minimal in-memory stub, installed via `vi.stubGlobal`
 * BEFORE importing the module under test, is what lets `persist`'s
 * `setItem`/`getItem` calls succeed in this environment without pulling in
 * `happy-dom`/`jsdom` for the whole test file.
 */
function createLocalStorageStub(): Storage {
	const store = new Map<string, string>();

	return {
		getItem: (key) => store.get(key) ?? null,
		setItem: (key, value) => {
			store.set(key, value);
		},
		removeItem: (key) => {
			store.delete(key);
		},
		clear: () => store.clear(),
		key: (index) => Array.from(store.keys())[index] ?? null,
		get length() {
			return store.size;
		},
	};
}

vi.stubGlobal("localStorage", createLocalStorageStub());

const { useCartStore } = await import("../store");

/**
 * RETARGETED (`sdd/ecommerce-product-variants/design`, Phase 7):
 * `useCartStore.addItem` now takes a `(product, variant)` pair — a cart
 * line item is a specific variant, not a product — instead of the old flat
 * `Product` shape.
 */
const product: PublicProduct = {
	id: "prod-1",
	name: "Oak Dining Chair",
	slug: "oak-dining-chair",
	description: null,
	coverImage: null,
	categoryId: "cat-seating",
	variants: [],
};

const variant: PublicVariant = {
	id: "variant-natural",
	price: 129.99,
	stock: 12,
	isDefault: true,
	options: [
		{
			optionTypeSlug: "finish",
			optionTypeName: "Finish",
			valueSlug: "natural",
			value: "Natural",
			imageUrl: null,
			description: null,
		},
	],
};

describe("useCartStore", () => {
	beforeEach(() => {
		useCartStore.setState({ items: [] });
	});

	it("adds a new variant with quantity 1", () => {
		useCartStore.getState().addItem(product, variant);

		expect(useCartStore.getState().items).toEqual([
			{
				variantId: variant.id,
				productId: product.id,
				name: product.name,
				productSlug: product.slug,
				variantLabel: "Natural",
				price: variant.price,
				coverImage: product.coverImage,
				stock: variant.stock,
				quantity: 1,
			},
		]);
	});

	it("increments quantity when the same variant is added again", () => {
		useCartStore.getState().addItem(product, variant);
		useCartStore.getState().addItem(product, variant);

		expect(useCartStore.getState().items).toHaveLength(1);
		expect(useCartStore.getState().items[0]?.quantity).toBe(2);
	});

	it("updateQuantity removes the item once quantity reaches zero", () => {
		useCartStore.getState().addItem(product, variant);
		useCartStore.getState().updateQuantity(variant.id, -1);

		expect(useCartStore.getState().items).toHaveLength(0);
	});

	it("removeItem drops the item regardless of quantity", () => {
		useCartStore.getState().addItem(product, variant);
		useCartStore.getState().addItem(product, variant);
		useCartStore.getState().removeItem(variant.id);

		expect(useCartStore.getState().items).toHaveLength(0);
	});

	it("clearCart empties the cart", () => {
		useCartStore.getState().addItem(product, variant);
		useCartStore.getState().clearCart();

		expect(useCartStore.getState().items).toHaveLength(0);
	});

	it("adds two distinct variants of the same product as separate lines", () => {
		const otherVariant: PublicVariant = {
			...variant,
			id: "variant-walnut",
			price: 149.99,
			options: [
				{
					optionTypeSlug: "finish",
					optionTypeName: "Finish",
					valueSlug: "walnut",
					value: "Walnut",
					imageUrl: null,
					description: null,
				},
			],
		};

		useCartStore.getState().addItem(product, variant);
		useCartStore.getState().addItem(product, otherVariant);

		expect(useCartStore.getState().items).toHaveLength(2);
	});
});
