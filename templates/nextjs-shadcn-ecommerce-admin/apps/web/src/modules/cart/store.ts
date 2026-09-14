import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Product } from "@/generated/model";
import type { CartItem } from "./types";

/**
 * Ported near-verbatim from munod's real `hooks/use-cart.ts` — Zustand +
 * `persist`/`createJSONStorage(localStorage)`, matching this template's
 * "port whatever mechanism munod actually uses" instruction (task 6.5). Only
 * the item shape changed (`CartItem`, this module's own type, not munod's
 * `EcomProduct & { quantity }` — see `./types.ts`).
 *
 * `skipHydration: true` + the manual `.persist.rehydrate()` call in
 * `./context.tsx`'s provider is the documented Zustand+Next.js SSR pattern
 * for a client-only, localStorage-persisted store — a materially different
 * case from ADR 0021's "never a module-scope Zustand store" warning
 * (`.claude/rules/frontend-technical-conventions.md`), which targets
 * server-rendered state naively shared across requests. This store never
 * renders on the server at all; `skipHydration` is exactly what prevents a
 * server/client markup mismatch for state that only ever lives in the
 * browser.
 */
interface CartState {
	items: CartItem[];
	addItem: (product: Product) => void;
	removeItem: (productSlug: string) => void;
	updateQuantity: (productSlug: string, amount: number) => void;
	clearCart: () => void;
}

export const useCartStore = create<CartState>()(
	persist(
		(set, get) => ({
			items: [],

			addItem: (product) => {
				const items = get().items;
				const existingItem = items.find((item) => item.slug === product.slug);

				if (existingItem) {
					set({
						items: items.map((item) =>
							item.slug === product.slug
								? { ...item, quantity: item.quantity + 1 }
								: item,
						),
					});
					return;
				}

				const cartItem: CartItem = {
					id: product.id,
					name: product.name,
					slug: product.slug,
					price: product.price,
					coverImage: product.coverImage,
					stock: product.stock,
					quantity: 1,
				};

				set({ items: [...items, cartItem] });
			},

			updateQuantity: (productSlug, amount) => {
				const items = get().items;
				const newItems = items
					.map((item) =>
						item.slug === productSlug
							? { ...item, quantity: Math.max(0, item.quantity + amount) }
							: item,
					)
					.filter((item) => item.quantity > 0);

				set({ items: newItems });
			},

			removeItem: (productSlug) => {
				set({
					items: get().items.filter((item) => item.slug !== productSlug),
				});
			},

			clearCart: () => set({ items: [] }),
		}),
		{
			name: "cart-storage",
			storage: createJSONStorage(() => localStorage),
			skipHydration: true,
		},
	),
);
