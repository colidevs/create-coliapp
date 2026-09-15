"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	createVariantOptionValue,
	deleteVariantOptionValue,
	getVariantOptionValueById,
	listVariantOptionValues,
	updateVariantOptionValue,
} from "@/generated/endpoints";
import { toActionState } from "@/lib/problem";
import type {
	ListVariantOptionValuesParams,
	VariantOptionValue,
	VariantOptionValueCreate,
	VariantOptionValueUpdate,
} from "./types";

export type VariantOptionValueActionResult =
	| { success: true; data: VariantOptionValue }
	| ({ success: false } & ActionFormState);

/**
 * `admin/variant-option-values` has no pagination either (flat array,
 * optionally filtered by `optionTypeId` — confirmed against `apps/api`'s own
 * `repository.ts`/`route.ts`), same shape as `admin/product-images`'s own
 * `?productId=` filter. Sliced client-side, same reasoning as
 * `modules/product-images/actions.ts`'s own `paginationQuery`.
 */
export const paginationQuery: PaginationQueryFn<
	VariantOptionValue,
	ListVariantOptionValuesParams
> = async ({ pageIndex, pageSize }, filters) => {
	const all = await listVariantOptionValuesQuery(filters);
	const start = pageIndex * pageSize;
	return { rows: all.slice(start, start + pageSize), totalRows: all.length };
};

export async function listVariantOptionValuesQuery(
	params?: ListVariantOptionValuesParams,
): Promise<VariantOptionValue[]> {
	const result = await listVariantOptionValues(params);
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data;
}

export async function getVariantOptionValueByIdQuery(
	id: string,
): Promise<VariantOptionValue | null> {
	const result = await getVariantOptionValueById(id);
	if (result.status !== 200) return null;
	return result.data;
}

export async function createVariantOptionValueAction(
	input: VariantOptionValueCreate,
): Promise<VariantOptionValueActionResult> {
	const result = await createVariantOptionValue(input);
	if (result.status !== 201) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function updateVariantOptionValueAction(
	id: string,
	input: VariantOptionValueUpdate,
): Promise<VariantOptionValueActionResult> {
	const result = await updateVariantOptionValue(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function deleteVariantOptionValueAction(
	id: string,
): Promise<{ success: boolean }> {
	const result = await deleteVariantOptionValue(id);
	return { success: result.status === 204 };
}
