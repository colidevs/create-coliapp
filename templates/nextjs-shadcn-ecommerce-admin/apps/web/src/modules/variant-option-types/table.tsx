"use client";

import { Check, Eye, List, PenIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAbility } from "@/components/can";
import {
	DataTable,
	DataTableColumnHeader,
	DatetimeCell,
	DetailCardLink,
	DetailLinkCell,
	type DropdownMenuActionsProps,
	type TableColumn,
} from "@/components/data-table";
import { deleteVariantOptionTypeAction, paginationQuery } from "./actions";
import { useVariantOptionTypesContext } from "./context";
import type { VariantOptionType } from "./types";

/**
 * Structural port of `modules/categories/table.tsx`. Row action "Manage
 * values" is the only entry point into `admin/variant-option-values` —
 * design/tasks add exactly one sidebar nav entry ("Option types"), so values
 * are reached scoped-by-type from here, mirroring `admin/product-images`'s
 * own `?productId=` scoping convention (`modules/product-images/page.tsx`).
 */
export function VariantOptionTypesTable() {
	const { queryKey } = useVariantOptionTypesContext();
	const ability = useAbility();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<VariantOptionType>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/variant-option-types/${id}`),
		},
		{
			title: "Manage values",
			icon: <List />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/variant-option-values?optionTypeId=${id}`),
		},
	];

	if (ability.can("update", "VariantOptionType")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/variant-option-types/${id}/update`),
		});
	}

	const columns: TableColumn<VariantOptionType>[] = [
		{
			id: "id",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>ID</DataTableColumnHeader>
			),
			accessorKey: "id",
			meta: { displayName: "ID", hide: true },
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
			id: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Name</DataTableColumnHeader>
			),
			cell: ({ row }) => (
				<DetailLinkCell
					href={`/admin/variant-option-types/${row.original.id}`}
					label={row.original.name}
				/>
			),
			accessorKey: "name",
			meta: { displayName: "Name" },
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

	// ADR 0030's `exactOptionalPropertyTypes` floor rejects an object literal
	// explicitly assigning `onDelete: undefined` to `DataTable`'s optional
	// `onDelete?` prop — conditionally spread the whole prop in instead of
	// ever assigning it `undefined`.
	return (
		<DataTable
			queryKey={queryKey}
			actions={actions}
			columns={columns}
			paginationQuery={paginationQuery}
			addRegister={ability.can("create", "VariantOptionType")}
			renderMobileRow={(row) => (
				<div className="px-4 py-3">
					<DetailCardLink
						href={`/admin/variant-option-types/${row.original.id}`}
						title={row.original.name}
					/>
				</div>
			)}
			{...(ability.can("delete", "VariantOptionType")
				? {
						onDelete: {
							label: (row: VariantOptionType) =>
								`Delete option type ${row.name}?`,
							onSuccess: async (row: VariantOptionType) => {
								await deleteVariantOptionTypeAction(row.id);
							},
						},
					}
				: {})}
		/>
	);
}
