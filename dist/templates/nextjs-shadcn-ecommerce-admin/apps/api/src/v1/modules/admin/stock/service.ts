import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type { GetStockParams, StockItem, StockUpdate } from "./types";

export interface Service {
	get: (
		ability: CatalogAbility,
		params: GetStockParams,
	) => Promise<StockItem[]>;
	getById: (ability: CatalogAbility, id: string) => Promise<StockItem>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: StockUpdate,
	) => Promise<StockItem>;
}

function stockService(repo: Repository): Service {
	async function get(
		ability: CatalogAbility,
		params: GetStockParams,
	): ReturnType<Service["get"]> {
		assertCan(ability, "read", "Stock");

		return repo.get(params);
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "Stock");

		const item = await repo.getById(id);

		if (!item) {
			throw new NotFoundHttpError(`Stock item ${id} not found`);
		}

		return item;
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: StockUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "Stock");

		const item = await repo.update(id, input);

		if (!item) {
			throw new NotFoundHttpError(`Stock item ${id} not found`);
		}

		return item;
	}

	return { get, getById, update };
}

export { stockService as createStockService };
