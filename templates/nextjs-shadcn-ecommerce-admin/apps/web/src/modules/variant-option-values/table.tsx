"use client";

import { Check, Eye, PenIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAbility } from "@/components/can";
import {
	DataTable,
	DataTableColumnHeader,
	DatetimeCell,
	type DropdownMenuActionsProps,
	ImageCell,
	type TableColumn,
} from "@/components/data-table";
import { deleteVariantOptionValueAction, paginationQuery } from "./actions";
import { useVariantOptionValuesContext } from "./context";
import type {
	ListVariantOptionValuesParams,
	VariantOptionValue,
} from "./types";

/** Structural port of `modules/product-images/table.tsx`. */
export function VariantOptionValuesTable({
	filters,
}: {
	filters?: ListVariantOptionValuesParams;
}) {
	const { queryKey } = useVariantOptionValuesContext();
	const ability = useAbility();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<VariantOptionValue>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/variant-option-values/${id}`),
		},
	];

	if (ability.can("update", "VariantOptionType")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/variant-option-values/${id}/update`),
		});
	}

	const columns: TableColumn<VariantOptionValue>[] = [
		{
			id: "imageUrl",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Image</DataTableColumnHeader>
			),
			accessorKey: "imageUrl",
			cell: ({ row }) => {
				const url = row.getValue<string | null>("imageUrl");
				return url ? <ImageCell url={url} /> : "—";
			},
			meta: { displayName: "Image" },
		},
		{
			id: "value",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Value</DataTableColumnHeader>
			),
			accessorKey: "value",
			meta: { displayName: "Value" },
		},
		{
			id: "slug",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Slug</DataTableColumnHeader>
			),
			accessorKey: "slug",
			meta: { displayName: "Slug", hide: true },
		},
		{
			id: "optionTypeId",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>
					Option type ID
				</DataTableColumnHeader>
			),
			accessorKey: "optionTypeId",
			meta: { displayName: "Option type ID", hide: true },
		},
		{
			id: "displayOrder",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Order</DataTableColumnHeader>
			),
			accessorKey: "displayOrder",
			meta: { displayName: "Order" },
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
			addRegister={ability.can("create", "VariantOptionType")}
			{...(filters ? { filters } : {})}
			{...(ability.can("delete", "VariantOptionType")
				? {
						onDelete: {
							label: (row: VariantOptionValue) => `Delete value ${row.value}?`,
							onSuccess: async (row: VariantOptionValue) => {
								await deleteVariantOptionValueAction(row.id);
							},
						},
					}
				: {})}
		/>
	);
}
