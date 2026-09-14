/**
 * `cart` domain (`sdd/ecommerce-product-variants/design`, Phase 7) —
 * RETARGETED from `Pick<Product, ...>` to a plain shape keyed by
 * `variantId`: a cart line item is a specific variant, not a product. Kept
 * as an inline shape (not `Pick<PublicVariant, ...> & ...`) because the item
 * needs fields from BOTH the parent product (`name`, `productSlug`,
 * `coverImage`) and the resolved variant (`price`, `stock`, and the derived
 * `variantLabel`) — no single generated type covers this shape.
 */
export type CartItem = {
	variantId: string;
	productId: string;
	name: string;
	productSlug: string;
	/** `null` for a single-variant product with zero option selections. */
	variantLabel: string | null;
	price: number;
	coverImage: string | null;
	stock: number;
	quantity: number;
};
