import { beforeEach, describe, expect, it, vi } from "vitest";

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

const product = {
	id: "prod-1",
	name: "Oak Dining Chair",
	slug: "oak-dining-chair",
	code: "CHR-001",
	altCode: null,
	description: null,
	price: 129.99,
	stock: 12,
	stockMin: 2,
	coverImage: null,
	categoryId: "cat-seating",
	isActive: true,
	createdAt: "2026-09-01T00:00:00.000Z",
	updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("useCartStore", () => {
	beforeEach(() => {
		useCartStore.setState({ items: [] });
	});

	it("adds a new product with quantity 1", () => {
		useCartStore.getState().addItem(product);

		expect(useCartStore.getState().items).toEqual([
			{
				id: product.id,
				name: product.name,
				slug: product.slug,
				price: product.price,
				coverImage: product.coverImage,
				stock: product.stock,
				quantity: 1,
			},
		]);
	});

	it("increments quantity when the same product is added again", () => {
		useCartStore.getState().addItem(product);
		useCartStore.getState().addItem(product);

		expect(useCartStore.getState().items).toHaveLength(1);
		expect(useCartStore.getState().items[0]?.quantity).toBe(2);
	});

	it("updateQuantity removes the item once quantity reaches zero", () => {
		useCartStore.getState().addItem(product);
		useCartStore.getState().updateQuantity(product.slug, -1);

		expect(useCartStore.getState().items).toHaveLength(0);
	});

	it("removeItem drops the item regardless of quantity", () => {
		useCartStore.getState().addItem(product);
		useCartStore.getState().addItem(product);
		useCartStore.getState().removeItem(product.slug);

		expect(useCartStore.getState().items).toHaveLength(0);
	});

	it("clearCart empties the cart", () => {
		useCartStore.getState().addItem(product);
		useCartStore.getState().clearCart();

		expect(useCartStore.getState().items).toHaveLength(0);
	});
});
