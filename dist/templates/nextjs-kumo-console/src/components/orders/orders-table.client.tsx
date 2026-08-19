"use client";

import { Button, LayerCard, Table } from "@cloudflare/kumo";

import type { Order } from "@/generated/orders/model";

/**
 * Compound `Table.*` leaf (task 3.6, `kumo-console-template` Phase 3).
 * RSC client-boundary rule (console-ui-kumo.md / frontend-technical-
 * conventions.md): any dot-notation compound component — `Table.Header`,
 * `Table.Row`, ... — needs its own `"use client"` file even though this
 * component itself renders nothing dynamic.
 *
 * Purely presentational: receives `orders` and two callbacks, holds no
 * fetching/mutation logic of its own — `src/components/orders/orders-list.client.tsx`
 * owns the data and the dialogs this table's row actions open.
 */
export interface OrdersTableProps {
	orders: Order[];
	onEdit: (order: Order) => void;
	onDelete: (order: Order) => void;
}

export function OrdersTable({ orders, onEdit, onDelete }: OrdersTableProps) {
	if (orders.length === 0) {
		return (
			<LayerCard className="text-kumo-subtle p-6 text-sm">
				No orders yet for this tenant.
			</LayerCard>
		);
	}

	return (
		<LayerCard className="overflow-x-auto p-0">
			<Table>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head sticky="right">
							<span className="sr-only">Actions</span>
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{orders.map((order) => (
						<Table.Row key={order.id}>
							<Table.Cell>{order.name}</Table.Cell>
							<Table.Cell className="whitespace-nowrap">
								{new Date(order.createdAt).toLocaleString()}
							</Table.Cell>
							<Table.Cell sticky="right" className="text-right">
								<div className="flex justify-end gap-2">
									<Button
										variant="secondary"
										size="sm"
										onClick={() => onEdit(order)}
									>
										Edit
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => onDelete(order)}
									>
										Delete
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</LayerCard>
	);
}
