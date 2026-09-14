/**
 * @description No new schema is defined here — public storefront reads
 * reuse `admin/products`'s own `.meta({id: "Product"/"ProductList"})`-
 * registered schemas, same reasoning as `web/categories/types.ts`.
 */
export type {
	GetProductsParams,
	Product,
} from "@/v1/modules/admin/products/types";

export interface GetPublicProductsParams {
	page?: number;
	size?: number;
	categoryId?: string;
	q?: string;
}
