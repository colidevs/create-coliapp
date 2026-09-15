import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Price } from "@/lib/currency";
import type { PublicProduct } from "@/modules/products/types";
import { ProductCard } from "./product-card";
import { resolveDefaultVariant } from "./variant-selection";

/**
 * Adapted, not a byte-for-byte port, of munod's real
 * `modules/products/ecommerce/product-view.tsx`. Munod's version composes a
 * `HorizontalScroll`-driven, scroll-jacked storytelling layout (desktop) plus
 * a stacked mobile layout, both threading through a multi-image/video
 * gallery, a `NewsletterForm`, and a marketing footer nav — none of which
 * this generic template ports (see `shell.tsx`'s doc comment for the same
 * reasoning applied to the shell). This is a plain, responsive two-column
 * layout: single hero `coverImage` + `ProductCard`, plus a "related
 * products" section computed from the real public API (same category,
 * excluding the current product) rather than munod's own curated
 * `relatedProducts` prop.
 *
 * RETARGETED (`sdd/ecommerce-product-variants/design`, Phase 7): typed
 * against `PublicProduct`; the related-products strip shows each related
 * product's "from $X" price off its own `isDefault` variant (design D4 —
 * no stored parent rollup price).
 */
export function ProductView({
	product,
	relatedProducts,
}: {
	product: PublicProduct;
	relatedProducts: PublicProduct[];
}) {
	return (
		<div className="mx-auto max-w-6xl px-4 py-12">
			<div className="grid gap-8 md:grid-cols-2">
				<div className="relative aspect-square bg-muted">
					{product.coverImage ? (
						<Image
							src={product.coverImage}
							alt={product.name}
							fill
							sizes="(min-width: 768px) 50vw, 100vw"
							className="object-contain"
							priority
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground text-sm">
							<ImageOff className="size-8" aria-hidden />
							No image
						</div>
					)}
				</div>
				<ProductCard product={product} />
			</div>

			{relatedProducts.length > 0 ? (
				<section className="mt-16">
					<h2 className="mb-6 font-semibold text-lg">Related products</h2>
					<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
						{relatedProducts.map((related) => {
							const relatedDefaultVariant = resolveDefaultVariant(related);
							return (
								<Link
									key={related.id}
									href={`/products/${related.slug}`}
									className="group block"
								>
									<div className="relative aspect-square bg-muted">
										{related.coverImage ? (
											<Image
												src={related.coverImage}
												alt={related.name}
												fill
												sizes="224px"
												className="object-contain"
											/>
										) : null}
									</div>
									<div className="mt-2 flex items-center justify-between text-sm">
										<span className="group-hover:underline">
											{related.name}
										</span>
										{relatedDefaultVariant ? (
											<Price price={relatedDefaultVariant.price} />
										) : null}
									</div>
								</Link>
							);
						})}
					</div>
				</section>
			) : null}
		</div>
	);
}
