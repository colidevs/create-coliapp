import { AddToCartButton } from "@/components/cart-button";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ProductOutput } from "@/generated/model";
import { Price } from "@/lib/currency";

/**
 * Adapted, not a byte-for-byte port, of munod's real
 * `modules/products/ecommerce/product-card.tsx`. Munod's version is a large
 * detail-page hero card built around fields this template's ACTUAL public
 * product contract does not carry — `tags`, `product_type`, `size`
 * (furniture dimensions), a multi-image/video carousel with prev/next
 * controls, an accordion of furniture care/purchase-policy copy, and a
 * measurement-guide popover. None of that has a counterpart in
 * `ProductOutput` (`name`/`slug`/`description`/`price`/`stock`/
 * `coverImage` only). Kept the same export name and role (the info card
 * shown alongside the product image on the detail page,
 * `product-view.tsx`), simplified to what this template's schema actually
 * supports.
 */
export function ProductCard({ product }: { product: ProductOutput }) {
	return (
		<Card className="gap-6 rounded-none border-none bg-transparent shadow-none">
			<CardHeader>
				{product.stock === 0 ? (
					<Badge variant="outline" className="w-fit rounded-none uppercase">
						Out of stock
					</Badge>
				) : null}
				<CardTitle className="flex items-end justify-between gap-4 text-3xl">
					<h1 className="capitalize">{product.name}</h1>
					<span className="shrink-0 font-bold text-lg">
						<Price price={product.price} />
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{product.description ? (
					<CardDescription className="text-card-foreground text-sm">
						{product.description}
					</CardDescription>
				) : null}
			</CardContent>
			<CardFooter>
				<AddToCartButton product={product} />
			</CardFooter>
		</Card>
	);
}
