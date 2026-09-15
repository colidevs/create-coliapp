import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Storefront-scoped `not-found` boundary — added live-audit fix (P1 finding
 * #12, `sdd/ecommerce-product-variants` post-pilot Playwright UX audit):
 * visiting a nonexistent product (`products/[slug]/page.tsx`'s `notFound()`
 * call) previously fell through to Next.js's stock, unbranded 404, with no
 * header/nav even though every other storefront route keeps one. Placed
 * inside the `(ecommerce)` route group so Next nests it under
 * `EcommerceRootLayout` — the Header/Footer/cart chrome comes for free from
 * that layout, no manual re-wiring needed.
 */
export default function ProductNotFound() {
	return (
		<div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
			<h1 className="font-semibold text-3xl">Product not found</h1>
			<p className="max-w-md text-muted-foreground">
				The product you're looking for doesn't exist or may have been removed.
			</p>
			<Button asChild>
				<Link href="/products">Back to shop</Link>
			</Button>
		</div>
	);
}
