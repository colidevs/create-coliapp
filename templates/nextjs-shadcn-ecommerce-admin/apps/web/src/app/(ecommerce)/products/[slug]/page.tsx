import { notFound } from "next/navigation";

import {
	getPublicProductBySlug,
	listPublicProducts,
} from "@/generated/endpoints";
import { ProductView } from "@/modules/products/ecommerce/product-view";

type Props = {
	params: Promise<{ slug: string }>;
};

/**
 * Ported (structurally) from munod's real
 * `app/(ecommerce)/products/[slug]/page.tsx` — same shape (fetch the
 * product by slug, fetch a related-products list, render `ProductView`),
 * against this template's ACTUAL public product endpoints
 * (`getPublicProductBySlug`/`listPublicProducts`). A direct, non-revalidating
 * Server Component read (no `getQueryClient()` prefetch) — per ADR 0021,
 * that pattern is reserved for data a Client Component ALSO needs to read;
 * `ProductView` is fully server-rendered with no client-side refetch need.
 */
export default async function ProductPage({ params }: Props) {
	const { slug } = await params;

	const result = await getPublicProductBySlug(slug);

	if (result.status !== 200) {
		notFound();
	}

	const product = result.data;

	const relatedResult = product.categoryId
		? await listPublicProducts({
				categoryId: product.categoryId,
				size: 5,
			})
		: null;

	const relatedProducts = (
		relatedResult?.status === 200 ? relatedResult.data.items : []
	).filter((item) => item.slug !== product.slug);

	return (
		<ProductView
			product={product}
			relatedProducts={relatedProducts.slice(0, 4)}
		/>
	);
}
