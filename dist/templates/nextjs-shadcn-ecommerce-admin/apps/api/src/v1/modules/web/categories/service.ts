import type { Category } from "@/v1/modules/admin/categories/types";
import type { Repository } from "./repository";

/**
 * @description No CASL gate here — public, unauthenticated storefront
 * reads carry no role/permission dimension at all (ADR 0013 only governs
 * the `/admin` surface). Coarse gating stays at `serviceAuth`
 * (`src/v1/middlewares/service-auth.ts`), which already applies to every
 * `/api/v1` route including this one — the storefront calls it
 * server-side (a Next.js Server Action), never directly from a browser.
 */
export interface Service {
	getActive: () => Promise<Category[]>;
}

function webCategoryService(repo: Repository): Service {
	async function getActive(): ReturnType<Service["getActive"]> {
		return repo.getActive();
	}

	return { getActive };
}

export { webCategoryService as createWebCategoryService };
