"use client";

import { Check, Eye, PenIcon } from "lucide-react";
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
import { deleteCategoryAction, paginationQuery } from "./actions";
import { useCategoriesContext } from "./context";
import type { Category } from "./types";

/**
 * Ported (structurally) from `munod/www/src/modules/categories/table.tsx`.
 *
 * **Corrected (PR7b): `router.push()`, not `next/navigation`'s `redirect()`.**
 * `redirect()` throws a special digest React only intercepts during a render
 * pass or inside a Server Action — called from a plain client `onClick`
 * handler it is just an uncaught exception (React error boundaries don't
 * catch event-handler errors), so these row actions silently did nothing.
 * Found and fixed across every `table.tsx` in one pass, see
 * `components/data-table.tsx`'s own `add()` for the full writeup.
 */
export function CategoriesTable() {
	const { queryKey } = useCategoriesContext();
	const ability = useAbility();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<Category>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) => router.push(`/admin/categories/${id}`),
		},
	];

	if (ability.can("update", "Category")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/categories/${id}/update`),
		});
	}

	const columns: TableColumn<Category>[] = [
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
					href={`/admin/categories/${row.original.id}`}
					label={row.original.name}
				/>
			),
			accessorKey: "name",
			meta: { displayName: "Name" },
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
			addRegister={ability.can("create", "Category")}
			renderMobileRow={(row) => (
				<div className="px-4 py-3">
					<DetailCardLink
						href={`/admin/categories/${row.original.id}`}
						title={row.original.name}
					/>
				</div>
			)}
			{...(ability.can("delete", "Category")
				? {
						onDelete: {
							label: (row: Category) => `Delete category ${row.name}?`,
							onSuccess: async (row: Category) => {
								await deleteCategoryAction(row.id);
							},
						},
					}
				: {})}
		/>
	);
}
