import { notFound } from "next/navigation";
import { getVariantOptionTypeByIdQuery } from "@/modules/variant-option-types/actions";
import { VariantOptionTypeForm } from "@/modules/variant-option-types/form";

export default async function AdminVariantOptionTypeUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const optionType = await getVariantOptionTypeByIdQuery(id);

	if (!optionType) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit option type</h1>
			<VariantOptionTypeForm optionType={optionType} />
		</div>
	);
}
