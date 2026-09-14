import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { ProductOutput } from "@/generated/model";
import { Price } from "@/lib/currency";

/**
 * Adapted, not a byte-for-byte port, of munod's real
 * `modules/products/ecommerce/product-link.tsx`. Munod's version reads
 * `product.images[0]`/`product.total_price`/`product.product_type` — fields
 * from its own `EcomProductListItem` domain type that this template's
 * ACTUAL generated public product contract (`ProductOutput`: a single
 * `coverImage`, no gallery, no `product_type`) does not carry. Kept the same
 * export name and grid-card shape; dropped the fields with no counterpart.
 */
export function ProductLink({ product }: { product: ProductOutput }) {
	return (
		<Link href={`/products/${product.slug}`} className="group block">
			<Card className="gap-1.5 overflow-hidden rounded-none border-none bg-transparent p-0 shadow-none">
				<CardContent className="relative aspect-square border p-0">
					{product.stock === 0 ? (
						<Badge
							variant="outline"
							className="absolute top-2 left-2 z-20 rounded-none uppercase"
						>
							Out of stock
						</Badge>
					) : null}
					{product.coverImage ? (
						<Image
							src={product.coverImage}
							alt={product.name}
							fill
							sizes="(min-width: 1536px) 350px, 300px"
							className="object-contain"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-xs">
							No image
						</div>
					)}
				</CardContent>
				<CardFooter className="flex items-center justify-between gap-2 px-0">
					<span className="truncate font-medium group-hover:underline">
						{product.name}
					</span>
					<span className="shrink-0">
						<Price price={product.price} />
					</span>
				</CardFooter>
			</Card>
		</Link>
	);
}
