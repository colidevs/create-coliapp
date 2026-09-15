import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { listVariantOptionValuesQuery } from "@/modules/variant-option-values/actions";
import { VariantForm } from "@/modules/variants/form";

export default async function AdminProductVariantAddPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const [optionTypes, optionValues] = await Promise.all([
		listVariantOptionTypesQuery(),
		listVariantOptionValuesQuery(),
	]);

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New variant</h1>
			<VariantForm
				defaultProductId={id}
				optionTypes={optionTypes}
				optionValues={optionValues}
			/>
		</div>
	);
}
