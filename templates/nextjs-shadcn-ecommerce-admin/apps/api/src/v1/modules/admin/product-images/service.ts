import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type {
	GetProductImagesParams,
	ProductImage,
	ProductImageCreate,
	ProductImageUpdate,
} from "./types";

export interface Service {
	get: (
		ability: CatalogAbility,
		params: GetProductImagesParams,
	) => Promise<ProductImage[]>;
	getById: (ability: CatalogAbility, id: string) => Promise<ProductImage>;
	create: (
		ability: CatalogAbility,
		input: ProductImageCreate,
	) => Promise<ProductImage>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: ProductImageUpdate,
	) => Promise<ProductImage>;
	delete: (ability: CatalogAbility, id: string) => Promise<void>;
}

function productImageService(repo: Repository): Service {
	async function get(
		ability: CatalogAbility,
		params: GetProductImagesParams,
	): ReturnType<Service["get"]> {
		assertCan(ability, "read", "ProductImage");

		return repo.get(params);
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "ProductImage");

		const image = await repo.getById(id);

		if (!image) {
			throw new NotFoundHttpError(`Product image ${id} not found`);
		}

		return image;
	}

	async function create(
		ability: CatalogAbility,
		input: ProductImageCreate,
	): ReturnType<Service["create"]> {
		assertCan(ability, "create", "ProductImage");

		return repo.create(input);
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: ProductImageUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "ProductImage");

		const image = await repo.update(id, input);

		if (!image) {
			throw new NotFoundHttpError(`Product image ${id} not found`);
		}

		return image;
	}

	async function deleteOne(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["delete"]> {
		assertCan(ability, "delete", "ProductImage");

		const deleted = await repo.delete(id);

		if (!deleted) {
			throw new NotFoundHttpError(`Product image ${id} not found`);
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { productImageService as createProductImageService };
