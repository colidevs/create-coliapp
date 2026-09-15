import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { VariantOptionValueForm } from "@/modules/variant-option-values/form";

export default async function AdminVariantOptionValueAddPage({
	searchParams,
}: {
	searchParams: Promise<{ optionTypeId?: string }>;
}) {
	const [{ optionTypeId }, optionTypes] = await Promise.all([
		searchParams,
		listVariantOptionTypesQuery(),
	]);

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New option value</h1>
			<VariantOptionValueForm
				optionTypes={optionTypes}
				defaultOptionTypeId={optionTypeId}
			/>
		</div>
	);
}
