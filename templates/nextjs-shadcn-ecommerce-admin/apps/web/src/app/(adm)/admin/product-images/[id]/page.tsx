import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { ImageCell } from "@/components/data-table";
import { formatDate } from "@/lib/utils";
import { getProductImageByIdQuery } from "@/modules/product-images/actions";

export default async function AdminProductImageDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const image = await getProductImageByIdQuery(id);

	if (!image) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={`Image ${image.id}`} />
				<p className="text-muted-foreground text-sm">
					Created: {formatDate(image.createdAt)}
				</p>
			</ArticleHeader>
			<ImageCell url={image.url} />
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="Product ID" description={image.productId} />
				<ArticleItem title="Position" description={String(image.position)} />
				<ArticleItem title="URL" description={image.url} />
			</ArticleContent>
		</Article>
	);
}
