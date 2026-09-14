"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	createCategory,
	deleteCategory,
	getCategoryById,
	listCategories,
	updateCategory,
} from "@/generated/endpoints";
import { toActionState } from "@/lib/problem";
import type { Category, CategoryCreate, CategoryUpdate } from "./types";

export type CategoryActionResult =
	| { success: true; data: Category }
	| ({ success: false } & ActionFormState);

/**
 * `admin/categories` (`apps/api`) has no pagination at all — it returns the
 * full `Category[]` (`GET /admin/categories`, confirmed against the real
 * `repository.ts`/`route.ts`), an ADR 0009 "small, static, bounded table"
 * exception. `DataTable`'s own contract (`manualPagination: true`) still
 * expects a `{ rows, totalRows }` page — sliced client-side here, over the
 * one full-list fetch, rather than over a server-side offset/cursor this
 * endpoint doesn't support.
 */
export const paginationQuery: PaginationQueryFn<Category> = async ({
	pageIndex,
	pageSize,
}) => {
	const all = await listCategoriesQuery();
	const start = pageIndex * pageSize;
	return { rows: all.slice(start, start + pageSize), totalRows: all.length };
};

export async function listCategoriesQuery(): Promise<Category[]> {
	const result = await listCategories();
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data;
}

export async function getCategoryByIdQuery(
	id: string,
): Promise<Category | null> {
	const result = await getCategoryById(id);
	if (result.status !== 200) return null;
	return result.data;
}

export async function createCategoryAction(
	input: CategoryCreate,
): Promise<CategoryActionResult> {
	const result = await createCategory(input);
	if (result.status !== 201) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function updateCategoryAction(
	id: string,
	input: CategoryUpdate,
): Promise<CategoryActionResult> {
	const result = await updateCategory(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function deleteCategoryAction(
	id: string,
): Promise<{ success: boolean }> {
	const result = await deleteCategory(id);
	return { success: result.status === 204 };
}
