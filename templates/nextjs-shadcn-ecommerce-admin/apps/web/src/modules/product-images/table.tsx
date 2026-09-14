"use client";

import { Eye, PenIcon } from "lucide-react";
import { RedirectType, redirect } from "next/navigation";

import { useAbility } from "@/components/can";
import {
	DataTable,
	DataTableColumnHeader,
	DatetimeCell,
	type DropdownMenuActionsProps,
	ImageCell,
	type TableColumn,
} from "@/components/data-table";
import { deleteProductImageAction, paginationQuery } from "./actions";
import { useProductImagesContext } from "./context";
import type { ListProductImagesParams, ProductImage } from "./types";

export function ProductImagesTable({
	filters,
}: {
	filters?: ListProductImagesParams;
}) {
	const { queryKey } = useProductImagesContext();
	const ability = useAbility();

	const actions: DropdownMenuActionsProps<ProductImage>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) =>
				redirect(`/admin/product-images/${id}`, RedirectType.push),
		},
	];

	if (ability.can("update", "ProductImage")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				redirect(`/admin/product-images/${id}/update`, RedirectType.push),
		});
	}

	const columns: TableColumn<ProductImage>[] = [
		{
			id: "url",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Image</DataTableColumnHeader>
			),
			accessorKey: "url",
			cell: ({ row }) => <ImageCell url={row.getValue("url")} />,
			meta: { displayName: "Image" },
		},
		{
			id: "productId",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>
					Product ID
				</DataTableColumnHeader>
			),
			accessorKey: "productId",
			meta: { displayName: "Product ID" },
		},
		{
			id: "position",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Position</DataTableColumnHeader>
			),
			accessorKey: "position",
			meta: { displayName: "Position" },
		},
		{
			id: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>
					Created at
				</DataTableColumnHeader>
			),
			cell: ({ row }) => (
				<DatetimeCell date={row.getValue<string>("createdAt")} />
			),
			accessorKey: "createdAt",
			meta: { displayName: "Created at", hide: true },
		},
	];

	return (
		<DataTable
			queryKey={queryKey}
			actions={actions}
			columns={columns}
			paginationQuery={paginationQuery}
			addRegister={ability.can("create", "ProductImage")}
			{...(filters ? { filters } : {})}
			{...(ability.can("delete", "ProductImage")
				? {
						onDelete: {
							label: () => "Delete this image?",
							onSuccess: async (row: ProductImage) => {
								await deleteProductImageAction(row.id);
							},
						},
					}
				: {})}
		/>
	);
}
