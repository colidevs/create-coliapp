import type { PublicProduct } from "@/modules/products/types";
import { ProductLink } from "./product-link";

/**
 * Ported near-verbatim from munod's real
 * `modules/products/ecommerce/products-grid.tsx` — the one component in this
 * file set with no domain-specific field dependency, so it needed no
 * structural adaptation beyond the type swap (`ProductOutput` ->
 * `PublicProduct`, `sdd/ecommerce-product-variants/design`, Phase 7).
 */
export function ProductsGrid({ products }: { products: PublicProduct[] }) {
	if (products.length === 0) {
		return (
			<div className="flex items-center justify-center py-24 text-muted-foreground text-sm tracking-wide">
				No results for this selection.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{products.map((product) => (
				<ProductLink key={product.id} product={product} />
			))}
		</div>
	);
}
