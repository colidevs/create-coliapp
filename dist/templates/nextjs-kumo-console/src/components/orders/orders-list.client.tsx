"use client";

import { Button } from "@cloudflare/kumo";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { listOrdersQuery } from "@/app/(console)/orders/queries";
import {
	type OrdersQueryInput,
	ordersQueryKey,
} from "@/app/(console)/orders/query-keys";
import type { Order } from "@/generated/orders/model";
import { DeleteOrderDialog } from "./delete-order-dialog.client";
import { OrderFormDialog } from "./order-form-dialog.client";
import { OrdersTable } from "./orders-table.client";

/**
 * The `<Suspense>`-wrapped client leaf `orders/page.tsx` renders (task 3.4).
 * `useSuspenseQuery` with the **same** `queryKey`/`queryFn` shape as the
 * page's own `prefetchQuery` call — the "Hydration match" spec scenario:
 * on first render this resolves straight from the hydrated cache
 * `<HydrationBoundary>` seeded, no refetch flash.
 */
export interface OrdersListProps {
	queryInput: OrdersQueryInput;
}

export function OrdersList({ queryInput }: OrdersListProps) {
	const router = useRouter();
	const { data } = useSuspenseQuery({
		queryKey: ordersQueryKey(queryInput),
		queryFn: () => listOrdersQuery(queryInput),
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<Order | undefined>();
	const [deletingOrder, setDeletingOrder] = useState<Order | undefined>();

	// Server Actions already `revalidatePath("/orders")` on success
	// (src/app/(console)/orders/actions.ts); `router.refresh()` is what
	// re-runs this page's Server Component so the next `prefetchQuery` +
	// `<HydrationBoundary>` cycle carries the fresh data back down.
	function handleMutationSuccess() {
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<Button variant="primary" onClick={() => setCreateOpen(true)}>
					New order
				</Button>
			</div>
			<OrdersTable
				orders={data.items}
				onEdit={setEditingOrder}
				onDelete={setDeletingOrder}
			/>
			<OrderFormDialog
				mode="create"
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSuccess={handleMutationSuccess}
			/>
			<OrderFormDialog
				mode="edit"
				order={editingOrder}
				open={editingOrder !== undefined}
				onOpenChange={(open) => {
					if (!open) {
						setEditingOrder(undefined);
					}
				}}
				onSuccess={handleMutationSuccess}
			/>
			<DeleteOrderDialog
				order={deletingOrder}
				onOpenChange={(open) => {
					if (!open) {
						setDeletingOrder(undefined);
					}
				}}
				onSuccess={handleMutationSuccess}
			/>
		</div>
	);
}
