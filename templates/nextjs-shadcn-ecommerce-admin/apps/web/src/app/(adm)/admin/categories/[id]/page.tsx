import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { formatDate } from "@/lib/utils";
import { getCategoryByIdQuery } from "@/modules/categories/actions";

export default async function AdminCategoryDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const category = await getCategoryByIdQuery(id);

	if (!category) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={category.name} />
				<p className="text-muted-foreground text-sm">
					Last updated: {formatDate(category.updatedAt)} · Created:{" "}
					{formatDate(category.createdAt)}
				</p>
			</ArticleHeader>
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="ID" description={category.id} />
				<ArticleItem title="Slug" description={category.slug} />
				<ArticleItem
					title="Active"
					description={category.isActive ? "Yes" : "No"}
				/>
			</ArticleContent>
		</Article>
	);
}
