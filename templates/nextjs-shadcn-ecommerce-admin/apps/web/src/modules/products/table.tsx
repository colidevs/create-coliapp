"use client";

import { Check, Eye, PenIcon } from "lucide-react";
import { RedirectType, redirect } from "next/navigation";

import { useAbility } from "@/components/can";
import {
	DataTable,
	DataTableColumnHeader,
	DatetimeCell,
	DetailCardLink,
	DetailLinkCell,
	type DropdownMenuActionsProps,
	ImageCell,
	type TableColumn,
} from "@/components/data-table";
import { Price } from "@/lib/currency";
import { deleteProductAction, paginationQuery } from "./actions";
import { useProductsContext } from "./context";
import type { Product } from "./types";

/** Ported (structurally) from `munod/www/src/modules/products/table.tsx`, columns trimmed to this template's actual, flatter `Product` shape (no `product_type`/`tags`/`is_published`/`discount` — design decision A4). */
export function ProductsTable() {
	const { queryKey } = useProductsContext();
	const ability = useAbility();

	const actions: DropdownMenuActionsProps<Product>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) =>
				redirect(`/admin/products/${id}`, RedirectType.push),
		},
	];

	if (ability.can("update", "Product")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				redirect(`/admin/products/${id}/update`, RedirectType.push),
		});
	}

	const columns: TableColumn<Product>[] = [
		{
			id: "coverImage",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Cover</DataTableColumnHeader>
			),
			accessorKey: "coverImage",
			cell: ({ row }) => (
				<ImageCell url={row.getValue<string | undefined>("coverImage")} />
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
					href={`/admin/products/${row.original.id}`}
					label={row.original.name}
				/>
			),
			accessorKey: "name",
			meta: { displayName: "Name" },
		},
		{
			id: "price",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Price</DataTableColumnHeader>
			),
			cell: ({ row }) => <Price price={row.getValue<number>("price")} />,
			accessorKey: "price",
			meta: { displayName: "Price" },
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
			id: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Active</DataTableColumnHeader>
			),
			cell: ({ row }) => (row.getValue("isActive") !== false ? <Check /> : "—"),
			accessorKey: "isActive",
			meta: { displayName: "Active" },
		},
		{
			id: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>
					Last updated
				</DataTableColumnHeader>
			),
			cell: ({ row }) => (
				<DatetimeCell date={row.getValue<string>("updatedAt")} />
			),
			accessorKey: "updatedAt",
			meta: { displayName: "Last updated", hide: true },
		},
	];

	return (
		<DataTable
			queryKey={queryKey}
			actions={actions}
			columns={columns}
			paginationQuery={paginationQuery}
			addRegister={ability.can("create", "Product")}
			renderMobileRow={(row) => (
				<div className="flex items-center gap-4 px-4 py-3">
					<ImageCell url={row.original.coverImage ?? undefined} />
					<DetailCardLink
						href={`/admin/products/${row.original.id}`}
						title={row.original.name}
						{...(row.original.code ? { description: row.original.code } : {})}
					/>
				</div>
			)}
			{...(ability.can("delete", "Product")
				? {
						onDelete: {
							label: (row: Product) => `Delete product ${row.name}?`,
							onSuccess: async (row: Product) => {
								await deleteProductAction(row.id);
							},
						},
					}
				: {})}
		/>
	);
}
