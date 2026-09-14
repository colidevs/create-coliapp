import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type { Category, CategoryCreate, CategoryUpdate } from "./types";

export interface Service {
	get: (ability: CatalogAbility) => Promise<Category[]>;
	getById: (ability: CatalogAbility, id: string) => Promise<Category>;
	create: (ability: CatalogAbility, input: CategoryCreate) => Promise<Category>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: CategoryUpdate,
	) => Promise<Category>;
	delete: (ability: CatalogAbility, id: string) => Promise<void>;
}

/**
 * @description Thin orchestration over `Repository`, same posture as the
 * `Dlocal` module's `service.ts` (design decision (a)) — repositories throw
 * the shared `HttpError` subclasses directly, so no error-translation
 * layer exists here. The one thing THIS layer owns that a repository
 * cannot: the CASL authorization check (`assertCan`, `src/lib/ability.ts`)
 * — ADR 0013's service-layer placement rule.
 */
function categoryService(repo: Repository): Service {
	async function get(ability: CatalogAbility): ReturnType<Service["get"]> {
		assertCan(ability, "read", "Category");

		return repo.getAll();
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "Category");

		const category = await repo.getById(id);

		if (!category) {
			throw new NotFoundHttpError(`Category ${id} not found`);
		}

		return category;
	}

	async function create(
		ability: CatalogAbility,
		input: CategoryCreate,
	): ReturnType<Service["create"]> {
		assertCan(ability, "create", "Category");

		return repo.create(input);
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: CategoryUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "Category");

		const category = await repo.update(id, input);

		if (!category) {
			throw new NotFoundHttpError(`Category ${id} not found`);
		}

		return category;
	}

	async function deleteOne(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["delete"]> {
		assertCan(ability, "delete", "Category");

		const deleted = await repo.delete(id);

		if (!deleted) {
			throw new NotFoundHttpError(`Category ${id} not found`);
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { categoryService as createCategoryService };
