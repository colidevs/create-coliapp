import { Package } from "lucide-react";

import { StockProviderClient } from "./context";
import { StockTable } from "./table";

/** Structural sibling of `modules/products/page.tsx` — NOT a port of munod's dialog-driven `stock/page.tsx` (see `table.tsx`'s own header comment). */
export function StockPage() {
	return (
		<StockProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<Package className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Stock</h1>
						<p className="text-muted-foreground text-sm">
							Review and adjust each product's stock level and low-stock
							threshold.
						</p>
					</div>
				</header>
				<StockTable />
			</section>
		</StockProviderClient>
	);
}
