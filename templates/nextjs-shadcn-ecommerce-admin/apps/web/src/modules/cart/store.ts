import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { formatVariantLabel } from "@/modules/products/ecommerce/variant-selection";
import type { PublicProduct, PublicVariant } from "@/modules/products/types";
import type { CartItem } from "./types";

/**
 * Ported near-verbatim from munod's real `hooks/use-cart.ts` — Zustand +
 * `persist`/`createJSONStorage(localStorage)`. RETARGETED
 * (`sdd/ecommerce-product-variants/design`, Phase 7): every lookup key that
 * used to be `item.slug === product.slug` is now `item.variantId ===
 * variant.id` — a cart line item is keyed by the specific variant a buyer
 * resolved via `variant-selector.tsx`, not by the parent product.
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
	addItem: (product: PublicProduct, variant: PublicVariant) => void;
	removeItem: (variantId: string) => void;
	updateQuantity: (variantId: string, amount: number) => void;
	clearCart: () => void;
}

export const useCartStore = create<CartState>()(
	persist(
		(set, get) => ({
			items: [],

			addItem: (product, variant) => {
				const items = get().items;
				const existingItem = items.find(
					(item) => item.variantId === variant.id,
				);

				if (existingItem) {
					set({
						items: items.map((item) =>
							item.variantId === variant.id
								? { ...item, quantity: item.quantity + 1 }
								: item,
						),
					});
					return;
				}

				const cartItem: CartItem = {
					variantId: variant.id,
					productId: product.id,
					name: product.name,
					productSlug: product.slug,
					variantLabel: formatVariantLabel(variant),
					price: variant.price,
					coverImage: product.coverImage,
					stock: variant.stock,
					quantity: 1,
				};

				set({ items: [...items, cartItem] });
			},

			updateQuantity: (variantId, amount) => {
				const items = get().items;
				const newItems = items
					.map((item) =>
						item.variantId === variantId
							? { ...item, quantity: Math.max(0, item.quantity + amount) }
							: item,
					)
					.filter((item) => item.quantity > 0);

				set({ items: newItems });
			},

			removeItem: (variantId) => {
				set({
					items: get().items.filter((item) => item.variantId !== variantId),
				});
			},

			clearCart: () => set({ items: [] }),
		}),
		{
			// Bumped from `"cart-storage"` — the old persisted shape keyed by
			// `slug`/`stock` at the top level and cannot deserialize into the new
			// `variantId`-keyed `CartItem` shape. A stale v1 payload in a
			// returning buyer's browser is simply ignored (fresh empty cart)
			// rather than crashing `persist`'s rehydration.
			name: "cart-storage-v2",
			storage: createJSONStorage(() => localStorage),
			skipHydration: true,
		},
	),
);
