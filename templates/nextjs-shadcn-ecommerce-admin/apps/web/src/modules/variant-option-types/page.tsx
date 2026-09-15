import { Tags } from "lucide-react";

import { VariantOptionTypesProviderClient } from "./context";
import { VariantOptionTypesTable } from "./table";

/** Structural port of `modules/categories/page.tsx`. */
export function VariantOptionTypesPage() {
	return (
		<VariantOptionTypesProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<Tags className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Option types</h1>
						<p className="text-muted-foreground text-sm">
							Manage the admin-defined variant option vocabulary (e.g. color,
							size).
						</p>
					</div>
				</header>
				<VariantOptionTypesTable />
			</section>
		</VariantOptionTypesProviderClient>
	);
}
