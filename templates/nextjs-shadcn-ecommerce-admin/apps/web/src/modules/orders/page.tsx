import { ClipboardList } from "lucide-react";

import { OrdersProviderClient } from "./context";
import { OrdersTable } from "./table";

/**
 * No munod precedent — confirmed no `orders` module exists anywhere under
 * `munod/www/src` (design decision A5 already noted this for `apps/api`;
 * the frontend side has the identical gap). Genuinely new code, structurally
 * matching every other entity module's `page.tsx` shape.
 */
export function OrdersPage() {
	return (
		<OrdersProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<ClipboardList className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Orders</h1>
						<p className="text-muted-foreground text-sm">
							Orders created via the storefront's checkout flow. Status changes
							exclusively through the dLocal payment webhook — this view is
							read-only.
						</p>
					</div>
				</header>
				<OrdersTable />
			</section>
		</OrdersProviderClient>
	);
}
