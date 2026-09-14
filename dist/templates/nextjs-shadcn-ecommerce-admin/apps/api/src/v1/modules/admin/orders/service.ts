import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Pagination } from "@/v1/types";
import type { Repository } from "./repository";
import type { GetOrdersParams, Order } from "./types";

export interface Service {
	get: (
		ability: CatalogAbility,
		params: GetOrdersParams,
	) => Promise<{ items: Order[]; pagination: Pagination }>;
	getById: (ability: CatalogAbility, id: string) => Promise<Order>;
}

/**
 * @description Thin orchestration over `Repository`, same posture as every
 * other admin module's `service.ts` (design decision (a)). The one thing
 * this layer owns: the CASL authorization check (ADR 0013's service-layer
 * placement rule). Unlike every other catalog subject, `"Order"` is granted
 * to the `"admin"` role only (`src/lib/ability.ts`) — orders carry buyer PII
 * (`mail`/`buyerInfo`), a deliberate, documented restriction narrower than
 * the catalog-read default every `"viewer"` role otherwise gets.
 */
function orderService(repo: Repository): Service {
	async function get(
		ability: CatalogAbility,
		params: GetOrdersParams,
	): ReturnType<Service["get"]> {
		assertCan(ability, "read", "Order");

		return repo.get(params);
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "Order");

		const order = await repo.getById(id);

		if (!order) {
			throw new NotFoundHttpError(`Order ${id} not found`);
		}

		return order;
	}

	return { get, getById };
}

export { orderService as createOrderService };
