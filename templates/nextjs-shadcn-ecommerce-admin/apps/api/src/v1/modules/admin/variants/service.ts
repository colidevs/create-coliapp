import { assertCan, type CatalogAbility } from "@/lib/ability";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type {
	GetVariantsParams,
	Variant,
	VariantCreate,
	VariantUpdate,
} from "./types";

export interface Service {
	get: (
		ability: CatalogAbility,
		params: GetVariantsParams,
	) => Promise<Variant[]>;
	getById: (ability: CatalogAbility, id: string) => Promise<Variant>;
	create: (ability: CatalogAbility, input: VariantCreate) => Promise<Variant>;
	update: (
		ability: CatalogAbility,
		id: string,
		input: VariantUpdate,
	) => Promise<Variant>;
	delete: (ability: CatalogAbility, id: string) => Promise<void>;
}

/**
 * @description Thin orchestration over `Repository`, same posture as every
 * other admin module. Asserted against the `"Variant"` CASL subject added in
 * `sdd/ecommerce-product-variants/design`'s CASL section (Phase 2) — a
 * variant is its own permission surface, unlike `variant-option-values`
 * (design D8). Repositories throw the shared `HttpError` subclasses
 * directly (`DuplicateSlugHttpError` doesn't apply here — variants carry no
 * unique slug — and `ProductRequiresActiveVariantHttpError` propagates
 * unchanged), so no error-translation layer exists here.
 */
function variantService(repo: Repository): Service {
	async function get(
		ability: CatalogAbility,
		params: GetVariantsParams,
	): ReturnType<Service["get"]> {
		assertCan(ability, "read", "Variant");

		return repo.get(params);
	}

	async function getById(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["getById"]> {
		assertCan(ability, "read", "Variant");

		const variant = await repo.getById(id);

		if (!variant) {
			throw new NotFoundHttpError(`Variant ${id} not found`);
		}

		return variant;
	}

	async function create(
		ability: CatalogAbility,
		input: VariantCreate,
	): ReturnType<Service["create"]> {
		assertCan(ability, "create", "Variant");

		return repo.create(input);
	}

	async function update(
		ability: CatalogAbility,
		id: string,
		input: VariantUpdate,
	): ReturnType<Service["update"]> {
		assertCan(ability, "update", "Variant");

		const variant = await repo.update(id, input);

		if (!variant) {
			throw new NotFoundHttpError(`Variant ${id} not found`);
		}

		return variant;
	}

	async function deleteOne(
		ability: CatalogAbility,
		id: string,
	): ReturnType<Service["delete"]> {
		assertCan(ability, "delete", "Variant");

		const deleted = await repo.delete(id);

		if (!deleted) {
			throw new NotFoundHttpError(`Variant ${id} not found`);
		}
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { variantService as createVariantService };
