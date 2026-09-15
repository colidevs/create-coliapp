import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { listVariantOptionValuesQuery } from "@/modules/variant-option-values/actions";
import { VariantsPage } from "@/modules/variants/page";

export default async function AdminProductVariantsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	// DX fix (this session's review + `colidevs/hefesto#104`): fetched here so
	// the list table can resolve each row's `optionValueIds` into human-
	// readable "OptionType: Value" labels (`resolveVariantOptionLabels`,
	// already used on the single-variant detail page) instead of a raw
	// "N selected" count.
	const [optionTypes, optionValues] = await Promise.all([
		listVariantOptionTypesQuery(),
		listVariantOptionValuesQuery(),
	]);

	return (
		<VariantsPage
			productId={id}
			optionTypes={optionTypes}
			optionValues={optionValues}
		/>
	);
}
