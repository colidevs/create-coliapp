"use client";

import { Check, Eye, PenIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAbility } from "@/components/can";
import {
	DataTable,
	DataTableColumnHeader,
	DatetimeCell,
	type DropdownMenuActionsProps,
	type TableColumn,
} from "@/components/data-table";
import { Price } from "@/lib/currency";
import { deleteVariantAction, paginationQuery } from "./actions";
import { useVariantsContext } from "./context";
import type { ListVariantsParams, Variant } from "./types";

/**
 * Structural sibling of `modules/product-images/table.tsx` /
 * `modules/variant-option-values/table.tsx` — scoped by `productId`, but
 * ALWAYS (never optionally, unlike those two) since this table is only ever
 * reached nested under `/admin/products/[id]/variants`. `DataTable`'s own
 * `add()` navigates to `${pathname}/add`, which — because `productId` here
 * is a PATH segment, not a query param — carries it forward automatically;
 * this table does not share `product-images`'/`variant-option-values`'s own
 * documented `add()`-drops-query-params gap.
 */
export function VariantsTable({
	productId,
	filters,
}: {
	productId: string;
	filters?: ListVariantsParams;
}) {
	const { queryKey } = useVariantsContext();
	const ability = useAbility();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<Variant>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/products/${productId}/variants/${id}`),
		},
	];

	if (ability.can("update", "Variant")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/products/${productId}/variants/${id}/update`),
		});
	}

	const columns: TableColumn<Variant>[] = [
		{
			id: "code",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Code</DataTableColumnHeader>
			),
			accessorKey: "code",
			meta: { displayName: "Code" },
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
			id: "optionValueIds",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Options</DataTableColumnHeader>
			),
			cell: ({ row }) =>
				row.original.optionValueIds.length > 0
					? `${row.original.optionValueIds.length} selected`
					: "—",
			accessorKey: "optionValueIds",
			meta: { displayName: "Options" },
		},
		{
			id: "isDefault",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Default</DataTableColumnHeader>
			),
			cell: ({ row }) => (row.getValue("isDefault") ? <Check /> : "—"),
			accessorKey: "isDefault",
			meta: { displayName: "Default" },
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
			addRegister={ability.can("create", "Variant")}
			filters={{ productId, ...filters }}
			{...(ability.can("delete", "Variant")
				? {
						onDelete: {
							label: (row: Variant) => `Delete variant ${row.code ?? row.id}?`,
							onSuccess: async (row: Variant) => {
								await deleteVariantAction(row.id);
							},
						},
					}
				: {})}
		/>
	);
}
