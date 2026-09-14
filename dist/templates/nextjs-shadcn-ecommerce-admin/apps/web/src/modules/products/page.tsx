import { Boxes } from "lucide-react";

import { ProductsProviderClient } from "./context";
import { ProductsTable } from "./table";

/** Ported (structurally) from `munod/www/src/modules/products/page.tsx`. */
export function ProductsPage() {
	return (
		<ProductsProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<Boxes className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Products</h1>
						<p className="text-muted-foreground text-sm">
							Manage the catalog's products.
						</p>
					</div>
				</header>
				<ProductsTable />
			</section>
		</ProductsProviderClient>
	);
}
