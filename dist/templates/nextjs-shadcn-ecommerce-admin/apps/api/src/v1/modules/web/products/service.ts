import type { Product } from "@/v1/modules/admin/products/types";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Pagination } from "@/v1/types";
import type { Repository } from "./repository";
import type { GetPublicProductsParams } from "./types";

export interface Service {
	getActive: (
		params: GetPublicProductsParams,
	) => Promise<{ items: Product[]; pagination: Pagination }>;
	getActiveBySlug: (slug: string) => Promise<Product>;
}

/**
 * @description No CASL gate — public reads, same posture as
 * `web/categories/service.ts`.
 */
function webProductService(repo: Repository): Service {
	async function getActive(
		params: GetPublicProductsParams,
	): ReturnType<Service["getActive"]> {
		return repo.getActive(params);
	}

	async function getActiveBySlug(
		slug: string,
	): ReturnType<Service["getActiveBySlug"]> {
		const product = await repo.getActiveBySlug(slug);

		if (!product) {
			throw new NotFoundHttpError(`Product ${slug} not found`);
		}

		return product;
	}

	return { getActive, getActiveBySlug };
}

export { webProductService as createWebProductService };
