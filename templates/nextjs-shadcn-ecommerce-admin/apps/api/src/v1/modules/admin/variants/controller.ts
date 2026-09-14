import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import { VariantCreateSchema, VariantUpdateSchema } from "./types";

export interface Controller {
	getVariants: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getVariantById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	createVariant: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateVariant: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	deleteVariant: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
}

/**
 * @description Mounted behind the `auth` middleware at the `/admin` mount
 * (`src/v1/route.ts`), so `res.locals.session` is always set by the time a
 * handler here runs. `resolveRole`/`defineAbilityFor` (`src/lib/ability.ts`)
 * build the CASL ability for this request; the service layer is what
 * actually enforces it (ADR 0013 placement rule) — this controller never
 * checks permissions itself.
 */
function controller(svc: Service): Controller {
	const getVariants: Controller["getVariants"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const productId = req.query.productId
			? String(req.query.productId)
			: undefined;

		const variants = await svc.get(ability, { productId });

		return res.status(200).json(variants);
	};

	const getVariantById: Controller["getVariantById"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const variant = await svc.getById(ability, req.params.id as string);

		return res.status(200).json(variant);
	};

	const createVariant: Controller["createVariant"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = VariantCreateSchema.parse(req.body);

		const variant = await svc.create(ability, input);

		return res
			.status(201)
			.location(`/api/v1/admin/variants/${variant.id}`)
			.json(variant);
	};

	const updateVariant: Controller["updateVariant"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = VariantUpdateSchema.parse(req.body);

		const variant = await svc.update(ability, req.params.id as string, input);

		return res.status(200).json(variant);
	};

	const deleteVariant: Controller["deleteVariant"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		await svc.delete(ability, req.params.id as string);

		return res.status(204).send();
	};

	return {
		getVariants,
		getVariantById,
		createVariant,
		updateVariant,
		deleteVariant,
	};
}

export { controller as createVariantController };
