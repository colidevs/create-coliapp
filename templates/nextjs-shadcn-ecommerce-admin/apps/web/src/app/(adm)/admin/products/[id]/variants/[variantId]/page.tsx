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
import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { listVariantOptionValuesQuery } from "@/modules/variant-option-values/actions";
import { getVariantByIdQuery } from "@/modules/variants/actions";
import { resolveVariantOptionLabels } from "@/modules/variants/types";

export default async function AdminProductVariantDetailPage({
	params,
}: {
	params: Promise<{ id: string; variantId: string }>;
}) {
	const { variantId } = await params;
	const [variant, optionTypes, optionValues] = await Promise.all([
		getVariantByIdQuery(variantId),
		listVariantOptionTypesQuery(),
		listVariantOptionValuesQuery(),
	]);

	if (!variant) notFound();

	const optionLabels = resolveVariantOptionLabels(
		variant,
		optionTypes,
		optionValues,
	);

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={variant.code ?? variant.id} />
				<p className="text-muted-foreground text-sm">
					Last updated: {formatDate(variant.updatedAt)} · Created:{" "}
					{formatDate(variant.createdAt)}
				</p>
			</ArticleHeader>
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="ID" description={variant.id} />
				<ArticleItem
					title="Alt. code"
					description={variant.altCode ?? undefined}
				/>
				<ArticleItem
					title="Price"
					description={<Price price={variant.price} />}
				/>
				<ArticleItem title="Stock" description={String(variant.stock)} />
				<ArticleItem
					title="Minimum stock"
					description={String(variant.stockMin)}
				/>
				<ArticleItem
					title="Default variant"
					description={variant.isDefault ? "Yes" : "No"}
				/>
				<ArticleItem
					title="Active"
					description={variant.isActive ? "Yes" : "No"}
				/>
				<ArticleItem
					title="Options"
					description={
						optionLabels.length > 0 ? optionLabels.join(", ") : undefined
					}
				/>
			</ArticleContent>
		</Article>
	);
}
