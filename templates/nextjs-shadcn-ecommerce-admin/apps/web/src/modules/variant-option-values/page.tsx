import { List } from "lucide-react";

import { VariantOptionValuesProviderClient } from "./context";
import { VariantOptionValuesTable } from "./table";
import type { ListVariantOptionValuesParams } from "./types";

/** Structural port of `modules/product-images/page.tsx`'s scoped-list shape. */
export function VariantOptionValuesPage({
	filters,
}: {
	// Explicit `| undefined` (ADR 0030's `exactOptionalPropertyTypes` floor)
	// — the caller (`app/(adm)/admin/variant-option-values/page.tsx`) derives
	// this from `await searchParams`, which is genuinely `T | undefined`, not
	// merely omittable.
	filters?: ListVariantOptionValuesParams | undefined;
}) {
	return (
		<VariantOptionValuesProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<List className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Option values</h1>
						<p className="text-muted-foreground text-sm">
							Manage the values available for an option type (e.g. red, blue,
							small, large).
						</p>
					</div>
				</header>
				<VariantOptionValuesTable {...(filters ? { filters } : {})} />
			</section>
		</VariantOptionValuesProviderClient>
	);
}
