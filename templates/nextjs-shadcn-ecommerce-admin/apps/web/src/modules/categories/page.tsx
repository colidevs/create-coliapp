import { Shapes } from "lucide-react";

import { CategoriesProviderClient } from "./context";
import { CategoriesTable } from "./table";

/** Ported (structurally) from `munod/www/src/modules/categories/page.tsx`. */
export function CategoriesPage() {
	return (
		<CategoriesProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<Shapes className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Categories</h1>
						<p className="text-muted-foreground text-sm">
							Manage the catalog's categories.
						</p>
					</div>
				</header>
				<CategoriesTable />
			</section>
		</CategoriesProviderClient>
	);
}
