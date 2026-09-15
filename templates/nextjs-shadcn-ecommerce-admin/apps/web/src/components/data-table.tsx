"use client";

import {
	keepPreviousData,
	QueryClientProvider,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	type CellContext,
	type Column,
	type ColumnDef,
	type CoreRow,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type PaginationState,
	type Row,
	type SortingState,
	type Table as TableType,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	ChevronsUpDown,
	EyeOff,
	File,
	Loader2,
	MoreHorizontal,
	Package,
	Plus,
	RefreshCw,
	Settings2,
	Trash,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";
import {
	Fragment,
	type PropsWithChildren,
	type ReactElement,
	useState,
} from "react";
import { toast } from "sonner";

import { ImageModal } from "@/components/image-modal";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/query";
import { cn, formatDate } from "@/lib/utils";

/**
 * Ported near-verbatim from munod (`munod/www/src/components/data-table.tsx`)
 * — twice-proven (near-identical across munod/org-jaulasvacias), per this
 * template's design (`sdd/ecommerce-admin-template/design`, "apps/web
 * Design" table). The one deliberate change: `queryClient` no longer comes
 * from a module-scope singleton (munod's own `@/lib/query`, ADR 0021
 * violation, `frontend-standard/munod/rollup`) — it comes from
 * `getQueryClient()` (design decision A6), called directly in the render
 * body of this "use client" leaf. On the server (SSR pass of this Client
 * Component) that returns a fresh, request-scoped instance every render; in
 * the browser it returns the same reused singleton every call, so
 * `<QueryClientProvider>` still gets a referentially stable client across
 * re-renders exactly as it needs.
 */
export type TableMetaType = { displayName: string; hide?: boolean };

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data?: TData[];
}

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
}

export type TableAction<TData> = {
	title: string | ((row: CoreRow<TData>["original"]) => string);
	icon: ReactElement;
	onClick: (row: CoreRow<TData>) => void;
	revalidateData?: boolean;
};

export interface DropdownMenuActionsProps<TData> {
	cell: CellContext<TData, unknown>;
	actions: TableAction<TData>[];
}

export type TableColumn<TData> = ColumnDef<TData> & { meta: TableMetaType };

export function getHiddenColumns<TData, TValue>(
	col: ColumnDef<TData, TValue>[],
): VisibilityState {
	return col.reduce((acc, column) => {
		if (column.id !== undefined && column.id !== null) {
			const hide = Boolean((column.meta as TableMetaType).hide ?? false);
			acc[column.id] = !hide;
		}
		return acc;
	}, {} as VisibilityState);
}

export function DescriptionCell({ str }: { str: string }) {
	const [expanded, setExpanded] = useState(false);

	if (!str) return "—";

	return (
		<div className="w-64 whitespace-normal align-top">
			<p className={cn("text-sm transition-all", !expanded && "line-clamp-1")}>
				{str}
			</p>

			{str.length > 40 && (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="mt-1 text-xs text-muted-foreground hover:underline"
				>
					{expanded ? "See less" : "See more"}
				</button>
			)}
		</div>
	);
}

export function ImageCell({ url }: { url: string | undefined }) {
	return url ? (
		<div className="w-32">
			<ImageModal url={url} className="size-32" />
		</div>
	) : (
		<Fragment>⚠️ No image</Fragment>
	);
}

export function DatetimeCell({ date }: { date: string }) {
	return <>{formatDate(date)}</>;
}

export function DetailLinkCell({
	href,
	label,
}: {
	href: string;
	label: string;
}) {
	return (
		<Link
			href={href}
			className="group flex hover:underline hover:underline-offset-4 items-start gap-1"
			title="View details"
		>
			{label}
			<ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
		</Link>
	);
}

export function DetailCardLink({
	href,
	title,
	description,
	className,
	children,
}: PropsWithChildren<{
	href: string;
	title: string;
	description?: string;
	className?: string;
}>) {
	return (
		<div className="flex items-center *:w-full">
			{children}
			<Link href={href} className={cn("space-y-2", className)}>
				<Label className="text-xl">{title}</Label>
				{description ? (
					<p className="text-pretty text-sm text-accent-foreground">
						{description}
					</p>
				) : null}
			</Link>
		</div>
	);
}

export function DataTableViewOptions<TData>({
	table,
}: {
	table: TableType<TData>;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="sm:ml-auto h-8 lg:flex">
					<Settings2 />
					<span className="hidden sm:inline ms-2">Columns</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[150px]">
				<DropdownMenuLabel>Hide columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{table
					.getAllColumns()
					.filter(
						(column) =>
							typeof column.accessorFn !== "undefined" && column.getCanHide(),
					)
					.map((column) => {
						return (
							<DropdownMenuCheckboxItem
								key={column.id}
								className="capitalize"
								checked={column.getIsVisible()}
								onCheckedChange={(value) => column.toggleVisibility(!!value)}
							>
								{(column.columnDef.meta as TableMetaType).displayName}
							</DropdownMenuCheckboxItem>
						);
					})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	className,
	children,
}: DataTableColumnHeaderProps<TData, TValue> & PropsWithChildren) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="data-[state=open]:bg-accent -ml-3 h-8"
					>
						<span>{children}</span>
						{column.getIsSorted() === "desc" ? (
							<ArrowDown />
						) : column.getIsSorted() === "asc" ? (
							<ArrowUp />
						) : (
							<ChevronsUpDown />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => column.toggleSorting(false)}>
						<ArrowUp />
						Asc
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
						<ArrowDown />
						Desc
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
						<EyeOff />
						Hide
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export function DropdownMenuActions<TData>({
	cell: { row, column },
	actions,
}: DropdownMenuActionsProps<TData>) {
	const meta = column.columnDef.meta as TableMetaType;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="p-0">
					<span className="sr-only">{meta.displayName}</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{meta.displayName}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{actions.map((x, i) => {
					const title =
						typeof x.title === "function" ? x.title(row.original) : x.title;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: actions is a fixed, per-render literal array (munod's own shape)
						<DropdownMenuItem key={i} onClick={() => x.onClick(row)}>
							{x.icon}
							<span className="ms-2">{title}</span>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export type PaginationQueryFn<TData, TFilters = unknown> = (
	pagination: PaginationState,
	filters?: TFilters,
) => Promise<{
	rows: TData[];
	totalRows: number;
}>;

export type DataTableComponentProps<TData, TValue, TFilters> = DataTableProps<
	TData,
	TValue
> & {
	queryKey: string;
	actions: DropdownMenuActionsProps<TData>["actions"];
	paginationQuery: PaginationQueryFn<TData, TFilters>;
	filters?: TFilters;
	onDelete?: {
		label: (row: TData) => string;
		onSuccess: (row: TData) => Promise<void>;
	};
	initPagination?: Partial<PaginationState>;
	initVisibleColumns?: VisibilityState;
	addRegister?: boolean;
	renderMobileRow?: (row: Row<TData>) => React.ReactNode;
};

const defaultPagination: PaginationState = {
	pageIndex: 0,
	pageSize: 20,
};

function DataTableComponent<TData, TValue, TFilters>({
	queryKey,
	columns,
	actions,
	paginationQuery,
	onDelete,
	filters,
	initPagination = defaultPagination,
	initVisibleColumns = getHiddenColumns(columns),
	addRegister = true,
	renderMobileRow,
}: DataTableComponentProps<TData, TValue, TFilters>) {
	const pathname = usePathname();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);

	const [columnVisibility, setColumnVisibility] =
		useState<VisibilityState>(initVisibleColumns);

	const [rowSelection, setRowSelection] = useState({});

	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: initPagination.pageIndex ?? defaultPagination.pageIndex,
		pageSize: initPagination.pageSize ?? defaultPagination.pageSize,
	});

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [rowToDelete, setRowToDelete] = useState<TData | null>(null);

	const query = useQuery({
		queryKey: [queryKey, pagination, filters],
		queryFn: () => paginationQuery(pagination, filters),
		placeholderData: keepPreviousData,
	});

	function revalidateData() {
		queryClient.invalidateQueries({ queryKey: [queryKey, pagination] });
	}

	const selectColumn: ColumnDef<TData, TValue> = {
		id: "select",
		header: ({ table }) => (
			<Checkbox
				className="mx-3"
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="ms-3"
			/>
		),
		enableSorting: false,
		enableHiding: false,
		meta: {
			displayName: "Selected",
		},
	};

	const deleteAction: TableAction<TData> = {
		title: "Delete",
		icon: <Trash />,
		onClick: ({ original }) => {
			setRowToDelete(original);
			setDeleteOpen(true);
		},
		revalidateData: true,
	};

	const allActions: TableAction<TData>[] = onDelete
		? [...actions, deleteAction]
		: actions;

	const actionsColumn: ColumnDef<TData, TValue> = {
		id: "actions",
		header: () => null,
		cell: (cell) => <DropdownMenuActions cell={cell} actions={allActions} />,
		meta: {
			displayName: "Actions",
		},
	};

	const table = useReactTable({
		data: query.data?.rows ?? [],
		columns: [selectColumn, ...columns, actionsColumn],
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		autoResetPageIndex: false,
		rowCount: query.data?.totalRows ?? 0,
		onPaginationChange: setPagination,
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			pagination,
		},
	});

	function handleCopySelected() {
		const selectedRows = table.getFilteredSelectedRowModel().rows;
		if (selectedRows.length === 0) return;

		const visibleColumns = table
			.getAllColumns()
			.filter((col) => col.getIsVisible());

		const headers = visibleColumns
			.map((col) => {
				if (col.id === "select" || col.id === "drag" || col.id === "actions") {
					return null;
				}
				return (
					(col.columnDef.meta as TableMetaType).displayName ?? col.id ?? "-"
				);
			})
			.filter(Boolean);

		const dataToCopy = selectedRows.map((row) => {
			return visibleColumns
				.map((col) => {
					if (
						col.id === "select" ||
						col.id === "drag" ||
						col.id === "actions"
					) {
						return null;
					}

					let cellValue: unknown = row.getValue(col.id);

					if (cellValue && typeof cellValue === "object") {
						if ("display_name" in cellValue) {
							cellValue = (cellValue as { display_name: string }).display_name;
						} else if ("name" in cellValue) {
							cellValue = (cellValue as { name: string }).name;
						} else if ("id" in cellValue) {
							cellValue = (cellValue as { id: string }).id;
						} else {
							cellValue = JSON.stringify(cellValue);
						}
					}

					if (col.id === "fee" && typeof cellValue === "number") {
						cellValue = `$${cellValue.toFixed(2)}`;
					}

					return cellValue?.toString() || "NONE";
				})
				.filter(Boolean);
		});

		const csvContent = [
			headers.join("\t"),
			...dataToCopy.map((row) => row.join("\t")),
		].join("\n");

		navigator.clipboard
			.writeText(csvContent)
			.then(() => {
				toast.success(`${selectedRows.length} row(s) copied to clipboard`);
			})
			.catch(() => {
				toast.error("❌ Error copying to clipboard. Please try again.");
			});
	}

	// `useRouter().push()`, NOT `next/navigation`'s `redirect()` — a real,
	// found-live bug (PR7b): `redirect()` unconditionally `throw`s a special
	// digest React only intercepts during a render pass or inside a Server
	// Action's own async-storage context (confirmed by reading
	// `next/dist/client/components/redirect.js` directly). Called from a
	// plain client-side event handler like this one, that throw is just an
	// uncaught exception in a DOM event listener — React error boundaries do
	// not catch event-handler errors, so this silently did nothing at all.
	// Every row-action `onClick` across every `table.tsx` in this admin
	// surface (PR7a's `categories`/`products`/`product-images`, PR7b's own
	// `stock`/`orders`) carried the identical bug — found and fixed together
	// in this same batch, verified via a real, authenticated Playwright
	// click-through (`e2e/admin-flow.spec.ts`), not just a type-check.
	function add() {
		router.push(`${pathname}/add`);
	}

	return (
		<>
			<aside className="inline-flex flex-col w-full gap-2 py-2 md:flex-row md:justify-between md:flex-wrap">
				<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
					<AlertDialogContent className="w-fit">
						<AlertDialogHeader>
							<AlertDialogTitle className="font-normal">
								{rowToDelete ? onDelete?.label(rowToDelete) : null}
							</AlertDialogTitle>
						</AlertDialogHeader>

						<AlertDialogFooter>
							<AlertDialogAction
								className="bg-red-700 hover:bg-red-800 text-white"
								onClick={() => {
									if (!rowToDelete) return;
									onDelete
										?.onSuccess?.(rowToDelete)
										.then(() => toast.success("Record deleted successfully."))
										.catch(() =>
											toast.error("There was an error deleting the record."),
										)
										.finally(() => {
											setRowToDelete(null);
											revalidateData();
										});
								}}
							>
								Delete
							</AlertDialogAction>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				<div className="inline-flex gap-2">
					{addRegister ? (
						<Button onClick={add} className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							New record
						</Button>
					) : null}
				</div>
				<div className="inline-flex gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								onClick={revalidateData}
								disabled={query.isFetching}
							>
								<RefreshCw
									className={cn(
										"h-4 w-4",
										query.isFetching ? "animate-spin" : "",
									)}
								/>
								<span className="hidden sm:inline">Refresh</span>
							</Button>
						</TooltipTrigger>
					</Tooltip>

					<Button
						variant="outline"
						size="sm"
						className="h-8"
						onClick={handleCopySelected}
						disabled={table.getFilteredSelectedRowModel().rows.length === 0}
					>
						<File className="h-4 w-4" />
						<span className="hidden sm:inline ml-2">Copy selected rows</span>
					</Button>
					<DataTableViewOptions table={table} />
				</div>
			</aside>
			<section className="overflow-hidden w-full md:rounded-md md:border">
				<Table>
					<TableHeader
						className={
							renderMobileRow ? "hidden sm:table-header-group" : undefined
						}
					>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<Fragment key={row.id}>
									{renderMobileRow && (
										<tr className="sm:hidden">
											<td colSpan={columns.length + 2} className="p-0 pb-3">
												<div className="border rounded-xl bg-background shadow-sm overflow-hidden">
													{renderMobileRow(row)}
													<div className="flex gap-2 px-4 py-3 border-t bg-muted/10">
														<Button
															variant="outline"
															size="sm"
															className="flex-1"
															onClick={() =>
																allActions
																	.find((a) => a.title === "Edit")
																	?.onClick(row)
															}
														>
															Edit
														</Button>
														<DropdownMenu modal={false}>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="outline"
																	size="sm"
																	className="flex-1"
																>
																	Other actions
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																{allActions
																	.filter((a) => a.title !== "Edit")
																	.map((action, i) => {
																		const title =
																			typeof action.title === "function"
																				? action.title(row.original)
																				: action.title;
																		return (
																			<DropdownMenuItem
																				// biome-ignore lint/suspicious/noArrayIndexKey: fixed, per-render literal array
																				key={i}
																				onClick={() => action.onClick(row)}
																				className="py-2"
																			>
																				{action.icon}
																				<span className="ms-2">{title}</span>
																			</DropdownMenuItem>
																		);
																	})}
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</div>
											</td>
										</tr>
									)}
									<TableRow
										data-state={row.getIsSelected() && "selected"}
										className={
											renderMobileRow ? "hidden sm:table-row" : undefined
										}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								</Fragment>
							))
						) : query.status === "pending" ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									Loading...
									<div className="text-center py-8 text-gray-500">
										<Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
									</div>
								</TableCell>
							</TableRow>
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results found.
									<div className="text-center py-8 text-gray-500">
										<Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<Button variant="outline" onClick={add} className="mt-2">
											New record
										</Button>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>
			<aside className="flex items-center justify-end space-x-2 py-4">
				<div className="flex flex-col sm:flex-row gap-2 sm:gap-0 items-start sm:items-center justify-between px-2 w-full">
					<div className="text-muted-foreground flex-1 text-sm me-4">
						{table.getFilteredSelectedRowModel().rows.length} of{" "}
						{table.getFilteredRowModel().rows.length} row(s) selected.
						<span className="ms-2">Total records: {table.getRowCount()}.</span>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-0 items-start sm:items-center space-x-6 lg:space-x-8">
						<div className="flex items-center space-x-2">
							<p className="text-sm font-medium">Rows per page</p>
							<Select
								value={`${table.getState().pagination.pageSize}`}
								onValueChange={(value) => {
									table.setPageSize(Number(value));
								}}
							>
								<SelectTrigger className="h-8 w-[70px]">
									<SelectValue
										placeholder={table.getState().pagination.pageSize}
									/>
								</SelectTrigger>
								<SelectContent side="top">
									{[5, 10, 20, 30, 40, 50].map((pageSize) => (
										<SelectItem key={pageSize} value={`${pageSize}`}>
											{pageSize}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex w-32 items-start sm:items-center justify-start sm:justify-center text-sm font-medium">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</div>
						<div className="flex items-center space-x-2">
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<Button
											variant="outline"
											size="icon"
											className="hidden size-8 lg:flex"
											onClick={() => table.setPageIndex(0)}
											disabled={!table.getCanPreviousPage()}
										>
											<span className="sr-only">First page</span>
											<ChevronsLeft />
										</Button>
									</PaginationItem>
									<PaginationItem>
										<Button
											variant="outline"
											size="icon"
											className="size-8"
											onClick={() => table.previousPage()}
											disabled={!table.getCanPreviousPage()}
										>
											<span className="sr-only">Previous page</span>
											<ChevronLeft />
										</Button>
									</PaginationItem>
									<PaginationItem>
										<Button
											variant="outline"
											size="icon"
											className="size-8"
											onClick={() => table.nextPage()}
											disabled={!table.getCanNextPage()}
										>
											<span className="sr-only">Next page</span>
											<ChevronRight />
										</Button>
									</PaginationItem>
									<PaginationItem>
										<Button
											variant="outline"
											size="icon"
											className="hidden size-8 lg:flex"
											onClick={() =>
												table.setPageIndex(table.getPageCount() - 1)
											}
											disabled={!table.getCanNextPage()}
										>
											<span className="sr-only">Last page</span>
											<ChevronsRight />
										</Button>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					</div>
				</div>
			</aside>
		</>
	);
}

export function DataTable<TData, TValue, TFilters>(
	props: DataTableComponentProps<TData, TValue, TFilters>,
) {
	return (
		<QueryClientProvider client={getQueryClient()}>
			<div className="w-full">
				<DataTableComponent {...props} />
			</div>
		</QueryClientProvider>
	);
}
