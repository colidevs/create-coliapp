"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	createVariantOptionType,
	deleteVariantOptionType,
	getVariantOptionTypeById,
	listVariantOptionTypes,
	updateVariantOptionType,
} from "@/generated/endpoints";
import { toActionState } from "@/lib/problem";
import type {
	VariantOptionType,
	VariantOptionTypeCreate,
	VariantOptionTypeUpdate,
} from "./types";

export type VariantOptionTypeActionResult =
	| { success: true; data: VariantOptionType }
	| ({ success: false } & ActionFormState);

/**
 * `admin/variant-option-types` has no pagination either (flat array,
 * confirmed against `apps/api`'s own `repository.ts`/`route.ts`), same shape
 * as `admin/categories`. Sliced client-side here, same reasoning as
 * `modules/categories/actions.ts`'s own `paginationQuery`.
 */
export const paginationQuery: PaginationQueryFn<VariantOptionType> = async ({
	pageIndex,
	pageSize,
}) => {
	const all = await listVariantOptionTypesQuery();
	const start = pageIndex * pageSize;
	return { rows: all.slice(start, start + pageSize), totalRows: all.length };
};

export async function listVariantOptionTypesQuery(): Promise<
	VariantOptionType[]
> {
	const result = await listVariantOptionTypes();
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data;
}

export async function getVariantOptionTypeByIdQuery(
	id: string,
): Promise<VariantOptionType | null> {
	const result = await getVariantOptionTypeById(id);
	if (result.status !== 200) return null;
	return result.data;
}

export async function createVariantOptionTypeAction(
	input: VariantOptionTypeCreate,
): Promise<VariantOptionTypeActionResult> {
	const result = await createVariantOptionType(input);
	if (result.status !== 201) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function updateVariantOptionTypeAction(
	id: string,
	input: VariantOptionTypeUpdate,
): Promise<VariantOptionTypeActionResult> {
	const result = await updateVariantOptionType(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function deleteVariantOptionTypeAction(
	id: string,
): Promise<{ success: boolean }> {
	const result = await deleteVariantOptionType(id);
	return { success: result.status === 204 };
}
