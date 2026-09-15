import Link from "next/link";
import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { Button } from "@/components/ui/button";
import { Price } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { getProductByIdQuery } from "@/modules/products/actions";

/**
 * **Retargeted (`sdd/ecommerce-product-variants`, design D3/D4)**: `code`/
 * `altCode`/`price`/`stock`/`stockMin` are gone from `ProductOutput` — those
 * live on `product_variants` now. `defaultPrice`/`variantCount` are the
 * derived, read-only replacements; a "Manage variants" link is the entry
 * point into this product's own variants sub-resource
 * (`admin/products/[id]/variants`).
 */
export default async function AdminProductDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const product = await getProductByIdQuery(id);

	if (!product) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={product.name} />
				<p className="text-muted-foreground text-sm">
					Last updated: {formatDate(product.updatedAt)} · Created:{" "}
					{formatDate(product.createdAt)}
				</p>
			</ArticleHeader>
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="ID" description={product.id} />
				<ArticleItem title="Slug" description={product.slug} />
				<ArticleItem
					title="From price"
					description={
						product.defaultPrice !== null ? (
							<Price price={product.defaultPrice} />
						) : (
							"No variants yet"
						)
					}
				/>
				<ArticleItem
					title="Variants"
					description={String(product.variantCount)}
				/>
				<ArticleItem
					title="Active"
					description={product.isActive ? "Yes" : "No"}
				/>
				<ArticleItem
					title="Description"
					description={product.description ?? undefined}
				/>
			</ArticleContent>
			<Button asChild variant="secondary">
				<Link href={`/admin/products/${product.id}/variants`}>
					Manage variants
				</Link>
			</Button>
		</Article>
	);
}
