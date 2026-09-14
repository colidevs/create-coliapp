"use client";

import { Eye, PenIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAbility } from "@/components/can";
import {
	DataTable,
	DataTableColumnHeader,
	DetailCardLink,
	DetailLinkCell,
	type DropdownMenuActionsProps,
	ImageCell,
	type TableColumn,
} from "@/components/data-table";
import { paginationQuery } from "./actions";
import { useStockContext } from "./context";
import type { Stock } from "./types";

/**
 * Structural sibling of `modules/products/table.tsx`, NOT a port of
 * munod's dialog-based `stock/table.tsx` (a `@tanstack/react-form`
 * STOCK-vs-STOCK_MIN toggle dialog) — this template's stock edit uses its
 * own dedicated `[id]/update` page, this module's uniform per-entity
 * CRUD-page convention. `addRegister`/`onDelete` are never wired here: real,
 * documented ability/route mismatch — `admin/stock` (`apps/api`) has no
 * create or delete route at all (`route.ts`: `GET /`, `GET /:id`,
 * `PATCH /:id` only), regardless of what `useAbility()` would otherwise
 * permit for the "admin" role's blanket `manage("Stock")` grant
 * (`src/lib/ability.ts`).
 */
export function StockTable() {
	const { queryKey } = useStockContext();
	const ability = useAbility();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<Stock>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) => router.push(`/admin/stock/${id}`),
		},
	];

	if (ability.can("update", "Stock")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/stock/${id}/update`),
		});
	}

	const columns: TableColumn<Stock>[] = [
		{
			id: "id",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>ID</DataTableColumnHeader>
			),
			accessorKey: "id",
			meta: { displayName: "ID", hide: true },
		},
		{
			id: "coverImage",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Cover</DataTableColumnHeader>
			),
			accessorKey: "coverImage",
			cell: ({ row }) => (
				<ImageCell
					url={row.getValue<string | null>("coverImage") ?? undefined}
				/>
			),
			meta: { displayName: "Cover" },
		},
		{
			id: "code",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Code</DataTableColumnHeader>
			),
			accessorKey: "code",
			meta: { displayName: "Code" },
		},
		{
			id: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Name</DataTableColumnHeader>
			),
			cell: ({ row }) => (
				<DetailLinkCell
					href={`/admin/stock/${row.original.id}`}
					label={row.original.name}
				/>
			),
			accessorKey: "name",
			meta: { displayName: "Name" },
		},
		{
			id: "stock",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Stock</DataTableColumnHeader>
			),
			accessorKey: "stock",
			meta: { displayName: "Stock" },
		},
		{
			id: "stockMin",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>
					Minimum stock
				</DataTableColumnHeader>
			),
			accessorKey: "stockMin",
			meta: { displayName: "Minimum stock" },
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
				<div className="flex items-center gap-4 px-4 py-3">
					<ImageCell url={row.original.coverImage ?? undefined} />
					<DetailCardLink
						href={`/admin/stock/${row.original.id}`}
						title={row.original.name}
						{...(row.original.code ? { description: row.original.code } : {})}
					/>
				</div>
			)}
		/>
	);
}
