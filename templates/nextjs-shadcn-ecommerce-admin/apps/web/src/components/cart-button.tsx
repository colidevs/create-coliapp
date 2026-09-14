"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/generated/model";
import { useCartDrawer } from "@/modules/cart/context";
import { useCartStore } from "@/modules/cart/store";

/**
 * Ported from munod's real `components/cart-button.tsx` (`AddToCartButton`)
 * — adapted to this template's actual generated `Product` shape (no
 * `EcomProduct`) and to `useCartStore`/`useCartDrawer` (this template's own
 * cart module, `src/modules/cart/`) rather than munod's `hooks/use-cart` +
 * `context/cart-sidebar-context`.
 */
export function AddToCartButton({ product }: { product: Product }) {
	const { addItem, items } = useCartStore();
	const { setOpen } = useCartDrawer();

	const isSelected = items.some((item) => item.slug === product.slug);

	const handleAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		addItem(product);
		setOpen(true);
	};

	return (
		<Button
			onClick={handleAdd}
			type="button"
			disabled={product.stock === 0}
			className="w-full"
		>
			{isSelected ? (
				<Check className="size-4" />
			) : product.stock === 0 ? (
				"Out of stock"
			) : (
				"Add to cart"
			)}
		</Button>
	);
}
