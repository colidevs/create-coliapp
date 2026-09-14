import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type {
	GetVariantOptionValuesParams,
	VariantOptionValue,
	VariantOptionValueCreate,
	VariantOptionValueUpdate,
} from "./types";

export interface Service {
	get: (
		ability: CatalogAbility,
		params: GetVariantOptionValuesParams,
	) => Promise<VariantOptionValue[]>;
	getById: (ability: CatalogAbility, id: string) => Promise<VariantOptionValue>;
	create: (
		ability: CatalogAbility,
		input: VariantOptionValueCreate,
	) => Promise<VariantOptionValue>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: VariantOptionValueUpdate,
	) => Promise<VariantOptionValue>;
	delete: (ability: CatalogAbility, id: string) => Promise<void>;
}

/**
 * @description Thin orchestration over `Repository`, same posture as
 * `admin/variant-option-types/service.ts` — repositories throw the shared
 * `HttpError` subclasses directly, so no error-translation layer exists
 * here. Asserted against the `"VariantOptionType"` subject, not a distinct
 * `"VariantOptionValue"` one — design D8: a value is a sub-resource of the
 * vocabulary (option type) it belongs to, not its own permission surface.
 */
function variantOptionValueService(repo: Repository): Service {
	async function get(
		ability: CatalogAbility,
		params: GetVariantOptionValuesParams,
	): ReturnType<Service["get"]> {
		assertCan(ability, "read", "VariantOptionType");

		return repo.get(params);
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "VariantOptionType");

		const variantOptionValue = await repo.getById(id);

		if (!variantOptionValue) {
			throw new NotFoundHttpError(`VariantOptionValue ${id} not found`);
		}

		return variantOptionValue;
	}

	async function create(
		ability: CatalogAbility,
		input: VariantOptionValueCreate,
	): ReturnType<Service["create"]> {
		assertCan(ability, "create", "VariantOptionType");

		return repo.create(input);
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: VariantOptionValueUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "VariantOptionType");

		const variantOptionValue = await repo.update(id, input);

		if (!variantOptionValue) {
			throw new NotFoundHttpError(`VariantOptionValue ${id} not found`);
		}

		return variantOptionValue;
	}

	async function deleteOne(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["delete"]> {
		assertCan(ability, "delete", "VariantOptionType");

		const deleted = await repo.delete(id);

		if (!deleted) {
			throw new NotFoundHttpError(`VariantOptionValue ${id} not found`);
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { variantOptionValueService as createVariantOptionValueService };
