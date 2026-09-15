import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { listVariantOptionValuesQuery } from "@/modules/variant-option-values/actions";
import { listVariantsQuery } from "@/modules/variants/actions";
import { VariantForm } from "@/modules/variants/form";
import { computeRequiredOptionTypeIds } from "@/modules/variants/types";

export default async function AdminProductVariantAddPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const [optionTypes, optionValues, siblingVariants] = await Promise.all([
		listVariantOptionTypesQuery(),
		listVariantOptionValuesQuery(),
		listVariantsQuery({ productId: id }),
	]);

	// Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11):
	// immediate UX feedback for the same invariant `apps/api`'s
	// `admin/variants/repository.ts` now enforces server-side — see that
	// file's own doc comment for why this must be derived from sibling
	// variants rather than a per-product option-type declaration (none
	// exists in this schema).
	const requiredOptionTypeIds = computeRequiredOptionTypeIds(
		siblingVariants,
		optionValues,
	);

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New variant</h1>
			<VariantForm
				defaultProductId={id}
				optionTypes={optionTypes}
				optionValues={optionValues}
				requiredOptionTypeIds={requiredOptionTypeIds}
			/>
		</div>
	);
}
