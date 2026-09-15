import { VariantOptionValueForm } from "@/modules/variant-option-values/form";

export default async function AdminVariantOptionValueAddPage({
	searchParams,
}: {
	searchParams: Promise<{ optionTypeId?: string }>;
}) {
	const { optionTypeId } = await searchParams;

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New option value</h1>
			<VariantOptionValueForm defaultOptionTypeId={optionTypeId} />
		</div>
	);
}
