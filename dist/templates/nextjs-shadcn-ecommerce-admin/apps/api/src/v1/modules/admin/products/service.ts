import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Pagination } from "@/v1/types";
import type { Repository } from "./repository";
import type {
	GetProductsParams,
	Product,
	ProductCreate,
	ProductUpdate,
} from "./types";

export interface Service {
	get: (
		ability: CatalogAbility,
		params: GetProductsParams,
	) => Promise<{ items: Product[]; pagination: Pagination }>;
	getById: (ability: CatalogAbility, id: string) => Promise<Product>;
	create: (ability: CatalogAbility, input: ProductCreate) => Promise<Product>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: ProductUpdate,
	) => Promise<Product>;
	delete: (ability: CatalogAbility, id: string) => Promise<void>;
}

function productService(repo: Repository): Service {
	async function get(
		ability: CatalogAbility,
		params: GetProductsParams,
	): ReturnType<Service["get"]> {
		assertCan(ability, "read", "Product");

		return repo.get(params);
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "Product");

		const product = await repo.getById(id);

		if (!product) {
			throw new NotFoundHttpError(`Product ${id} not found`);
		}

		return product;
	}

	async function create(
		ability: CatalogAbility,
		input: ProductCreate,
	): ReturnType<Service["create"]> {
		assertCan(ability, "create", "Product");

		return repo.create(input);
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: ProductUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "Product");

		const product = await repo.update(id, input);

		if (!product) {
			throw new NotFoundHttpError(`Product ${id} not found`);
		}

		return product;
	}

	async function deleteOne(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["delete"]> {
		assertCan(ability, "delete", "Product");

		const deleted = await repo.delete(id);

		if (!deleted) {
			throw new NotFoundHttpError(`Product ${id} not found`);
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { productService as createProductService };
