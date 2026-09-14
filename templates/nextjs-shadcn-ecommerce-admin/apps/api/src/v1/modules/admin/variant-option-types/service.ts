import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type {
	VariantOptionType,
	VariantOptionTypeCreate,
	VariantOptionTypeUpdate,
} from "./types";

export interface Service {
	get: (ability: CatalogAbility) => Promise<VariantOptionType[]>;
	getById: (ability: CatalogAbility, id: string) => Promise<VariantOptionType>;
	create: (
		ability: CatalogAbility,
		input: VariantOptionTypeCreate,
	) => Promise<VariantOptionType>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: VariantOptionTypeUpdate,
	) => Promise<VariantOptionType>;
	delete: (ability: CatalogAbility, id: string) => Promise<void>;
}

/**
 * @description Thin orchestration over `Repository`, same posture as
 * `admin/categories/service.ts` — repositories throw the shared `HttpError`
 * subclasses directly, so no error-translation layer exists here. The one
 * thing this layer owns that a repository cannot: the CASL authorization
 * check (`assertCan`, `src/lib/ability.ts`) — ADR 0013's service-layer
 * placement rule. Asserted against the `"VariantOptionType"` subject
 * (design D8's own vocabulary).
 */
function variantOptionTypeService(repo: Repository): Service {
	async function get(ability: CatalogAbility): ReturnType<Service["get"]> {
		assertCan(ability, "read", "VariantOptionType");

		return repo.getAll();
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "VariantOptionType");

		const variantOptionType = await repo.getById(id);

		if (!variantOptionType) {
			throw new NotFoundHttpError(`VariantOptionType ${id} not found`);
		}

		return variantOptionType;
	}

	async function create(
		ability: CatalogAbility,
		input: VariantOptionTypeCreate,
	): ReturnType<Service["create"]> {
		assertCan(ability, "create", "VariantOptionType");

		return repo.create(input);
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: VariantOptionTypeUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "VariantOptionType");

		const variantOptionType = await repo.update(id, input);

		if (!variantOptionType) {
			throw new NotFoundHttpError(`VariantOptionType ${id} not found`);
		}

		return variantOptionType;
	}

	async function deleteOne(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["delete"]> {
		assertCan(ability, "delete", "VariantOptionType");

		const deleted = await repo.delete(id);

		if (!deleted) {
			throw new NotFoundHttpError(`VariantOptionType ${id} not found`);
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { variantOptionTypeService as createVariantOptionTypeService };
