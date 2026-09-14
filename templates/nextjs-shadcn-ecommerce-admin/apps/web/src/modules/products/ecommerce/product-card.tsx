import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { PublicProduct } from "@/modules/products/types";
import { VariantSelector } from "./variant-selector";

/**
 * Adapted, not a byte-for-byte port, of munod's real
 * `modules/products/ecommerce/product-card.tsx`. Munod's version is a large
 * detail-page hero card built around fields this template's ACTUAL public
 * product contract does not carry — `tags`, `product_type`, `size`
 * (furniture dimensions), a multi-image/video carousel with prev/next
 * controls, an accordion of furniture care/purchase-policy copy, and a
 * measurement-guide popover. None of that has a counterpart in
 * `PublicProduct` (`name`/`slug`/`description`/`coverImage`/`variants[]`
 * only). Kept the same export name and role (the info card shown alongside
 * the product image on the detail page, `product-view.tsx`), simplified to
 * what this template's schema actually supports.
 *
 * RETARGETED (`sdd/ecommerce-product-variants/design`, Phase 7): price,
 * stock, and "Add to cart" all now live one level down inside
 * `<VariantSelector>` — a product has no single price/stock of its own
 * anymore, only its variants do.
 */
export function ProductCard({ product }: { product: PublicProduct }) {
	return (
		<Card className="gap-6 rounded-none border-none bg-transparent shadow-none">
			<CardHeader>
				<CardTitle className="text-3xl">
					<h1 className="capitalize">{product.name}</h1>
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
				<VariantSelector product={product} />
			</CardFooter>
		</Card>
	);
}
