import type { Product } from "@/generated/model";

/**
 * `cart` domain (`sdd/ecommerce-admin-template`, Phase 6 storefront port).
 * Ported concept from munod's `hooks/use-cart.ts` (`CartItem = EcomProduct &
 * { quantity: number }`), adapted to this template's ACTUAL generated public
 * product shape (`Product`/`ProductOutput` — a single `coverImage`, no
 * `images[]`/`tags`/`videos`/`size`/`product_type` fields munod's own
 * `EcomProduct` carries) rather than munod's domain-specific one.
 */
export type CartItem = Pick<
	Product,
	"id" | "name" | "slug" | "price" | "coverImage" | "stock"
> & {
	quantity: number;
};
