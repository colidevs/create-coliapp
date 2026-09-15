"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	createVariant,
	deleteVariant,
	getVariantById,
	listVariants,
	updateVariant,
} from "@/generated/endpoints";
import { toActionState } from "@/lib/problem";
import type {
	ListVariantsParams,
	Variant,
	VariantCreate,
	VariantUpdate,
} from "./types";

export type VariantActionResult =
	| { success: true; data: Variant }
	| ({ success: false } & ActionFormState);

/**
 * `admin/variants` has no pagination either (flat array, optionally
 * filtered by `productId` — confirmed against `apps/api`'s own
 * `repository.ts`/`route.ts`), same shape as `admin/product-images`'s own
 * `?productId=` filter. Sliced client-side, same reasoning as
 * `modules/product-images/actions.ts`'s own `paginationQuery`.
 */
export const paginationQuery: PaginationQueryFn<
	Variant,
	ListVariantsParams
> = async ({ pageIndex, pageSize }, filters) => {
	const all = await listVariantsQuery(filters);
	const start = pageIndex * pageSize;
	return { rows: all.slice(start, start + pageSize), totalRows: all.length };
};

export async function listVariantsQuery(
	params?: ListVariantsParams,
): Promise<Variant[]> {
	const result = await listVariants(params);
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data;
}

export async function getVariantByIdQuery(id: string): Promise<Variant | null> {
	const result = await getVariantById(id);
	if (result.status !== 200) return null;
	return result.data;
}

export async function createVariantAction(
	input: VariantCreate,
): Promise<VariantActionResult> {
	const result = await createVariant(input);
	if (result.status !== 201) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function updateVariantAction(
	id: string,
	input: VariantUpdate,
): Promise<VariantActionResult> {
	const result = await updateVariant(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function deleteVariantAction(
	id: string,
): Promise<{ success: boolean }> {
	const result = await deleteVariant(id);
	return { success: result.status === 204 };
}
