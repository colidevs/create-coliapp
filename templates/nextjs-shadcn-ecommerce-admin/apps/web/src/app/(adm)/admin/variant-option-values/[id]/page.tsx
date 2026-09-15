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
import { getVariantOptionValueByIdQuery } from "@/modules/variant-option-values/actions";

export default async function AdminVariantOptionValueDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const optionValue = await getVariantOptionValueByIdQuery(id);

	if (!optionValue) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={optionValue.value} />
				<p className="text-muted-foreground text-sm">
					Last updated: {formatDate(optionValue.updatedAt)} · Created:{" "}
					{formatDate(optionValue.createdAt)}
				</p>
			</ArticleHeader>
			{optionValue.imageUrl ? <ImageCell url={optionValue.imageUrl} /> : null}
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="ID" description={optionValue.id} />
				<ArticleItem title="Slug" description={optionValue.slug} />
				<ArticleItem
					title="Option type ID"
					description={optionValue.optionTypeId}
				/>
				<ArticleItem
					title="Description"
					description={optionValue.description ?? "—"}
				/>
				<ArticleItem
					title="Display order"
					description={String(optionValue.displayOrder)}
				/>
				<ArticleItem
					title="Active"
					description={optionValue.isActive ? "Yes" : "No"}
				/>
			</ArticleContent>
		</Article>
	);
}
