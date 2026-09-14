"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import {
	DataTable,
	DataTableColumnHeader,
	DatetimeCell,
	DetailCardLink,
	DetailLinkCell,
	type DropdownMenuActionsProps,
	type TableColumn,
} from "@/components/data-table";
import { paginationQuery } from "./actions";
import { useOrdersContext } from "./context";
import type { Order } from "./types";

/**
 * Read-only table — no "Edit"/delete action, no `useAbility()` gating on a
 * write action, because neither a write action nor an update route exists
 * at all (`modules/orders/actions.ts`'s own header comment). `"Order"` is
 * still CASL-gated server-side to the `"admin"` role only
 * (`apps/api/src/lib/ability.ts`) — a `"viewer"` session's `GET` gets a real
 * 403 from `apps/api`; this admin surface currently always renders with the
 * fixed `"admin"` role (`src/lib/ability.ts`'s documented `resolveRole`
 * seam, unchanged since Phase 3b/7a), so that path isn't reachable from
 * this UI today.
 */
export function OrdersTable() {
	const { queryKey } = useOrdersContext();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<Order>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) => router.push(`/admin/orders/${id}`),
		},
	];

	const columns: TableColumn<Order>[] = [
		{
			id: "id",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>ID</DataTableColumnHeader>
			),
			accessorKey: "id",
			meta: { displayName: "ID", hide: true },
		},
		{
			id: "orderId",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Order</DataTableColumnHeader>
			),
			cell: ({ row }) => (
				<DetailLinkCell
					href={`/admin/orders/${row.original.id}`}
					label={row.original.orderId}
				/>
			),
			accessorKey: "orderId",
			meta: { displayName: "Order" },
		},
		{
			id: "mail",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Email</DataTableColumnHeader>
			),
			cell: ({ row }) => row.getValue<string | null>("mail") ?? "—",
			accessorKey: "mail",
			meta: { displayName: "Email" },
		},
		{
			id: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Status</DataTableColumnHeader>
			),
			accessorKey: "status",
			meta: { displayName: "Status" },
		},
		{
			id: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Created</DataTableColumnHeader>
			),
			cell: ({ row }) => (
				<DatetimeCell date={row.getValue<string>("createdAt")} />
			),
			accessorKey: "createdAt",
			meta: { displayName: "Created", hide: true },
		},
	];

	return (
		<DataTable
			queryKey={queryKey}
			actions={actions}
			columns={columns}
			paginationQuery={paginationQuery}
			addRegister={false}
			renderMobileRow={(row) => (
				<div className="space-y-1 px-4 py-3">
					<DetailCardLink
						href={`/admin/orders/${row.original.id}`}
						title={row.original.orderId}
						description={row.original.status}
					/>
				</div>
			)}
		/>
	);
}
