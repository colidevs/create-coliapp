import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { formatDate } from "@/lib/utils";
import { getVariantOptionTypeByIdQuery } from "@/modules/variant-option-types/actions";

export default async function AdminVariantOptionTypeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const optionType = await getVariantOptionTypeByIdQuery(id);

	if (!optionType) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={optionType.name} />
				<p className="text-muted-foreground text-sm">
					Last updated: {formatDate(optionType.updatedAt)} · Created:{" "}
					{formatDate(optionType.createdAt)}
				</p>
			</ArticleHeader>
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="ID" description={optionType.id} />
				<ArticleItem title="Slug" description={optionType.slug} />
				<ArticleItem
					title="Display order"
					description={String(optionType.displayOrder)}
				/>
				<ArticleItem
					title="Active"
					description={optionType.isActive ? "Yes" : "No"}
				/>
			</ArticleContent>
		</Article>
	);
}
