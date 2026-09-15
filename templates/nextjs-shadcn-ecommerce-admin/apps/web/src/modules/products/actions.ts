"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	createProduct,
	deleteProduct,
	getProductById,
	getPublicProductBySlug,
	listProducts,
	listPublicProducts,
	updateProduct,
} from "@/generated/endpoints";
import type { ListPublicProductsParams, ProductList } from "@/generated/model";
import { toActionState } from "@/lib/problem";
import type {
	ListProductsParams,
	Product,
	ProductCreate,
	ProductUpdate,
} from "./types";

/**
 * Server Actions wrapping the generated public-product endpoints — required
 * (not merely convenient) because `@/generated/endpoints` transitively
 * imports `@/lib/api`'s `server-only`-guarded `apiRequest` mutator (Phase 5,
 * `x-service-key` header). `./queries.ts`'s `queryOptions()` is imported by
 * BOTH a Server Component (`products/page.tsx`'s `prefetchQuery`) and a
 * Client Component (`products-list-client.tsx`'s `useQuery`) — the client
 * side can never statically import the generated client directly (Next
 * fails the build: "You're importing a component that needs 'server-only'").
 * A `"use server"` export is what lets client code still reference the same
 * `queryFn` (e.g. TanStack Query's own window-refocus refetch) as an RPC
 * call, mirroring `nextjs-kumo-console/src/app/(console)/orders/queries.ts`'s
 * own established pattern exactly.
 *
 * Found live (RopaStore pilot): `page.tsx`/`products/page.tsx` both build
 * `params.page` 1-based (matching the storefront's human-facing `?page=`
 * URL convention and `products-list-client.tsx`'s `pagination.page > 1`/
 * `page - 1`/`page + 1` display logic), while `apps/api`'s `web/products`
 * repository paginates 0-based (`page ?? 0`, `offset = page * size` — same
 * convention as `admin/products`). Sending the UI's `page=1` unconverted
 * computed `offset = size`, skipping the only page of real data and
 * returning an empty `items[]` with a nonzero `pagination.total` — no
 * infra/seed/config issue, a pure off-by-one at this boundary. Convert at
 * the edge here so neither the API's own convention nor the UI's own
 * display convention has to change.
 *
 * This is now the codified org-wide standard, not a one-off patch: ADR
 * 0009's pagination row (`hefesto/docs/decisions/0009-api-communication-
 * standard.md`, addendum 2026-09-15) fixes 0-based as canonical at every
 * API/wire boundary, with a 1-based human-facing URL converted at the
 * client edge exactly as done here — never invented independently per app.
 */
export async function listPublicProductsQuery(
	params?: ListPublicProductsParams,
): Promise<ProductList> {
	const result = await listPublicProducts({
		...params,
		...(params?.page !== undefined ? { page: params.page - 1 } : {}),
	});

	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}

	return {
		...result.data,
		pagination: {
			...result.data.pagination,
			page: result.data.pagination.page + 1,
		},
	};
}

export async function getPublicProductBySlugQuery(slug: string) {
	const result = await getPublicProductBySlug(slug);

	if (result.status !== 200) {
		return null;
	}

	return result.data;
}

//* ADMIN ACTIONS (Phase 7 — `admin-catalog-crud` domain)

export type ProductActionResult =
	| { success: true; data: Product }
	| ({ success: false } & ActionFormState);

/**
 * `admin/products` DOES paginate server-side (`page`/`size`, 0-based —
 * confirmed against `admin/products/repository.ts`'s own
 * `page ?? 0`/`offset = page * size`), unlike `admin/categories`. Maps
 * directly onto `DataTable`'s own `pageIndex`/`pageSize` — no client-side
 * slicing needed here (contrast `modules/categories/actions.ts`'s
 * `paginationQuery`).
 */
export const paginationQuery: PaginationQueryFn<
	Product,
	ListProductsParams
> = async ({ pageIndex, pageSize }, filters) => {
	const result = await listProducts({
		page: pageIndex,
		size: pageSize,
		...filters,
	});

	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}

	return { rows: result.data.items, totalRows: result.data.pagination.total };
};

export async function getProductByIdQuery(id: string): Promise<Product | null> {
	const result = await getProductById(id);
	if (result.status !== 200) return null;
	return result.data;
}

export async function createProductAction(
	input: ProductCreate,
): Promise<ProductActionResult> {
	const result = await createProduct(input);
	if (result.status !== 201) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function updateProductAction(
	id: string,
	input: ProductUpdate,
): Promise<ProductActionResult> {
	const result = await updateProduct(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function deleteProductAction(
	id: string,
): Promise<{ success: boolean }> {
	const result = await deleteProduct(id);
	return { success: result.status === 204 };
}
