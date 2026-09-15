import { notFound } from "next/navigation";

import { listVariantOptionTypesQuery } from "@/modules/variant-option-types/actions";
import { listVariantOptionValuesQuery } from "@/modules/variant-option-values/actions";
import {
	getVariantByIdQuery,
	listVariantsQuery,
} from "@/modules/variants/actions";
import { VariantForm } from "@/modules/variants/form";
import { computeRequiredOptionTypeIds } from "@/modules/variants/types";

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

	// Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11): same
	// established-option-type derivation as the `add` page, EXCLUDING this
	// variant itself from its own sibling set (editing it must not count its
	// own current selections as "already established").
	const siblingVariants = await listVariantsQuery({
		productId: variant.productId,
	});
	const requiredOptionTypeIds = computeRequiredOptionTypeIds(
		siblingVariants,
		optionValues,
		variant.id,
	);

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit variant</h1>
			<VariantForm
				variant={variant}
				optionTypes={optionTypes}
				optionValues={optionValues}
				requiredOptionTypeIds={requiredOptionTypeIds}
			/>
		</div>
	);
}
