import { VariantOptionValuesPage } from "@/modules/variant-option-values/page";

export default async function AdminVariantOptionValuesPage({
	searchParams,
}: {
	searchParams: Promise<{ optionTypeId?: string }>;
}) {
	const { optionTypeId } = await searchParams;

	return (
		<VariantOptionValuesPage
			filters={optionTypeId ? { optionTypeId } : undefined}
		/>
	);
}
