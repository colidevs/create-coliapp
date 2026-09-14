"use client";

import { useEffect } from "react";

import { useCartStore } from "@/modules/cart/store";

/**
 * The return page (`page.tsx`) is a Server Component — it cannot touch the
 * client-only, localStorage-persisted cart store (`@/modules/cart/store`)
 * directly. This tiny client leaf clears it once, on mount, after a
 * checkout attempt reached the return page (regardless of the recorded
 * status — cancelled/failed carts are not auto-restored here; the buyer can
 * always re-add items).
 */
export function ClearCartOnReturn() {
	const clearCart = useCartStore((state) => state.clearCart);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clear exactly once on mount, not on every clearCart identity change
	useEffect(() => {
		clearCart();
	}, []);

	return null;
}
