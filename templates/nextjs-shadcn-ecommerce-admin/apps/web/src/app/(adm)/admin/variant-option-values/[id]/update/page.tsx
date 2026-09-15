import { notFound } from "next/navigation";

import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { getVariantOptionValueByIdQuery } from "@/modules/variant-option-values/actions";
import { VariantOptionValueForm } from "@/modules/variant-option-values/form";

export default async function AdminVariantOptionValueUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const [optionValue, optionTypes] = await Promise.all([
		getVariantOptionValueByIdQuery(id),
		listVariantOptionTypesQuery(),
	]);

	if (!optionValue) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit option value</h1>
			<VariantOptionValueForm
				optionValue={optionValue}
				optionTypes={optionTypes}
			/>
		</div>
	);
}
