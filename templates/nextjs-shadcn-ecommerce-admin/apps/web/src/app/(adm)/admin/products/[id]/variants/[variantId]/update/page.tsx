import { notFound } from "next/navigation";

import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { listVariantOptionValuesQuery } from "@/modules/variant-option-values/actions";
import { getVariantByIdQuery } from "@/modules/variants/actions";
import { VariantForm } from "@/modules/variants/form";

export default async function AdminProductVariantUpdatePage({
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

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit variant</h1>
			<VariantForm
				variant={variant}
				optionTypes={optionTypes}
				optionValues={optionValues}
			/>
		</div>
	);
}
