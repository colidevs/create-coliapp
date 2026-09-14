import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { ImageCell } from "@/components/data-table";
import { getStockByIdQuery } from "@/modules/stock/actions";

export default async function AdminStockDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const stock = await getStockByIdQuery(id);

	if (!stock) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={stock.name} />
			</ArticleHeader>
			<ImageCell url={stock.coverImage ?? undefined} />
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="ID" description={stock.id} />
				<ArticleItem title="Slug" description={stock.slug} />
				<ArticleItem title="Code" description={stock.code ?? undefined} />
				<ArticleItem
					title="Alt. code"
					description={stock.altCode ?? undefined}
				/>
				<ArticleItem title="Stock" description={String(stock.stock)} />
				<ArticleItem
					title="Minimum stock"
					description={String(stock.stockMin)}
				/>
			</ArticleContent>
		</Article>
	);
}
