import { Boxes } from "lucide-react";

import type { VariantOptionType, VariantOptionValue } from "@/generated/model";
import { VariantsProviderClient } from "./context";
import { VariantsTable } from "./table";

/**
 * Always scoped by `productId` (nested under `admin/products/[id]/variants`
 * — the design's own sub-resource routing, not a top-level
 * `admin/variants` list). Unlike `modules/product-images/page.tsx`'s
 * optional `filters`, this page has no unscoped use case: a variant's own
 * meaning (price/stock/option selections) is always relative to its parent
 * product.
 */
export function VariantsPage({
	productId,
	optionTypes,
	optionValues,
}: {
	productId: string;
	optionTypes: VariantOptionType[];
	optionValues: VariantOptionValue[];
}) {
	return (
		<VariantsProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<Boxes className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Variants</h1>
						<p className="text-muted-foreground text-sm">
							Manage this product's sellable variants — price, stock, and
							option-value selections.
						</p>
					</div>
				</header>
				<VariantsTable
					productId={productId}
					optionTypes={optionTypes}
					optionValues={optionValues}
				/>
			</section>
		</VariantsProviderClient>
	);
}
