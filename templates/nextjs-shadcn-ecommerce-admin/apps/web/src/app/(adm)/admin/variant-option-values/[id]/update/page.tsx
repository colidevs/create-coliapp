import { notFound } from "next/navigation";

import { getVariantOptionValueByIdQuery } from "@/modules/variant-option-values/actions";
import { VariantOptionValueForm } from "@/modules/variant-option-values/form";

export default async function AdminVariantOptionValueUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const optionValue = await getVariantOptionValueByIdQuery(id);

	if (!optionValue) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit option value</h1>
			<VariantOptionValueForm optionValue={optionValue} />
		</div>
	);
}
