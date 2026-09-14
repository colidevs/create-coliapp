"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartDrawer } from "@/modules/cart/context";
import { useCartStore } from "@/modules/cart/store";
import type { PublicProduct, PublicVariant } from "@/modules/products/types";

/**
 * Ported from munod's real `components/cart-button.tsx` (`AddToCartButton`)
 * — RETARGETED (`sdd/ecommerce-product-variants/design`, Phase 7) from the
 * old flat `Product` shape to a specific, already-RESOLVED `PublicVariant` —
 * a cart line item is a specific variant, not a product
 * (`modules/cart/types.ts`). `variant` is `undefined` only when
 * `variant-selector.tsx`'s `resolveVariant` found no match for the current
 * selection (or the product has zero variants); the button stays disabled
 * in that case, same as the zero-stock case.
 */
export function AddToCartButton({
	product,
	variant,
}: {
	product: PublicProduct;
	variant: PublicVariant | undefined;
}) {
	const { addItem, items } = useCartStore();
	const { setOpen } = useCartDrawer();

	const isSelected = variant
		? items.some((item) => item.variantId === variant.id)
		: false;
	const unavailable = !variant || variant.stock === 0;

	const handleAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!variant) return;
		addItem(product, variant);
		setOpen(true);
	};

	return (
		<Button
			onClick={handleAdd}
			type="button"
			disabled={unavailable}
			className="w-full"
		>
			{isSelected ? (
				<Check className="size-4" />
			) : unavailable ? (
				"Out of stock"
			) : (
				"Add to cart"
			)}
		</Button>
	);
}
