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
import type {
	ListPublicProductsParams,
	PublicProductList,
} from "@/generated/model";
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
 */
export async function listPublicProductsQuery(
	params?: ListPublicProductsParams,
): Promise<PublicProductList> {
	const result = await listPublicProducts(params);

	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}

	return result.data;
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
