"use client";

import { Boxes, Check, Eye, PenIcon } from "lucide-react";
import { useRouter } from "next/navigation";

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

/**
 * Ported (structurally) from `munod/www/src/modules/products/table.tsx`,
 * columns trimmed to this template's actual, flatter `Product` shape (no
 * `product_type`/`tags`/`is_published`/`discount` — design decision A4).
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, design D3/D4)**: `code`/
 * `price`/`stock` columns are gone — those live on `product_variants` now.
 * `Price`/`Stock` columns are replaced by the derived, read-only
 * `defaultPrice`/`variantCount` fields `ProductOutput` now carries (D4: "no
 * stored rollup price/stock column ... derived at read time from the
 * `is_default` variant"). A new "Variants" row action links to this
 * product's own variants sub-resource.
 *
 * **Corrected (PR7b): `router.push()`, not `redirect()`** — see
 * `modules/categories/table.tsx`'s identical fix and
 * `components/data-table.tsx`'s `add()` for the full writeup.
 */
export function ProductsTable() {
	const { queryKey } = useProductsContext();
	const ability = useAbility();
	const router = useRouter();

	const actions: DropdownMenuActionsProps<Product>["actions"] = [
		{
			title: "View details",
			icon: <Eye />,
			onClick: ({ original: { id } }) => router.push(`/admin/products/${id}`),
		},
		{
			title: "Variants",
			icon: <Boxes />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/products/${id}/variants`),
		},
	];

	if (ability.can("update", "Product")) {
		actions.push({
			title: "Edit",
			icon: <PenIcon />,
			onClick: ({ original: { id } }) =>
				router.push(`/admin/products/${id}/update`),
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
			id: "defaultPrice",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>
					From price
				</DataTableColumnHeader>
			),
			cell: ({ row }) => {
				const price = row.getValue<number | null>("defaultPrice");
				return price !== null ? <Price price={price} /> : "—";
			},
			accessorKey: "defaultPrice",
			meta: { displayName: "From price" },
		},
		{
			id: "variantCount",
			header: ({ column }) => (
				<DataTableColumnHeader column={column}>Variants</DataTableColumnHeader>
			),
			accessorKey: "variantCount",
			meta: { displayName: "Variants" },
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
						description={`${row.original.variantCount} variant${row.original.variantCount === 1 ? "" : "s"}`}
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
