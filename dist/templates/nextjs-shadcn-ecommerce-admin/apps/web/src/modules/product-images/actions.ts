"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	createProductImage,
	deleteProductImage,
	getProductImageById,
	listProductImages,
	updateProductImage,
} from "@/generated/endpoints";
import { toActionState } from "@/lib/problem";
import type {
	ListProductImagesParams,
	ProductImage,
	ProductImageCreate,
	ProductImageUpdate,
} from "./types";

export type ProductImageActionResult =
	| { success: true; data: ProductImage }
	| ({ success: false } & ActionFormState);

/**
 * `admin/product-images` has no pagination either (flat array, optionally
 * filtered by `productId` — confirmed against `apps/api`'s own
 * `repository.ts`/`route.ts`), same shape as `admin/categories`. Sliced
 * client-side here, same reasoning as `modules/categories/actions.ts`'s own
 * `paginationQuery`.
 */
export const paginationQuery: PaginationQueryFn<
	ProductImage,
	ListProductImagesParams
> = async ({ pageIndex, pageSize }, filters) => {
	const all = await listProductImagesQuery(filters);
	const start = pageIndex * pageSize;
	return { rows: all.slice(start, start + pageSize), totalRows: all.length };
};

export async function listProductImagesQuery(
	params?: ListProductImagesParams,
): Promise<ProductImage[]> {
	const result = await listProductImages(params);
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data;
}

export async function getProductImageByIdQuery(
	id: string,
): Promise<ProductImage | null> {
	const result = await getProductImageById(id);
	if (result.status !== 200) return null;
	return result.data;
}

export async function createProductImageAction(
	input: ProductImageCreate,
): Promise<ProductImageActionResult> {
	const result = await createProductImage(input);
	if (result.status !== 201) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function updateProductImageAction(
	id: string,
	input: ProductImageUpdate,
): Promise<ProductImageActionResult> {
	const result = await updateProductImage(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}

export async function deleteProductImageAction(
	id: string,
): Promise<{ success: boolean }> {
	const result = await deleteProductImage(id);
	return { success: result.status === 204 };
}
