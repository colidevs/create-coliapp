import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { Price } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { getProductByIdQuery } from "@/modules/products/actions";

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
				<ArticleItem title="Code" description={product.code ?? undefined} />
				<ArticleItem
					title="Alt. code"
					description={product.altCode ?? undefined}
				/>
				<ArticleItem
					title="Price"
					description={<Price price={product.price} />}
				/>
				<ArticleItem title="Stock" description={String(product.stock)} />
				<ArticleItem
					title="Minimum stock"
					description={String(product.stockMin)}
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
		</Article>
	);
}
