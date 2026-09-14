import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import {
	VariantOptionValueCreateSchema,
	VariantOptionValueUpdateSchema,
} from "./types";

export interface Controller {
	getVariantOptionValues: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getVariantOptionValueById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	createVariantOptionValue: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateVariantOptionValue: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	deleteVariantOptionValue: (
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
	const getVariantOptionValues: Controller["getVariantOptionValues"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const optionTypeId = req.query.optionTypeId
			? String(req.query.optionTypeId)
			: undefined;

		const variantOptionValues = await svc.get(ability, { optionTypeId });

		return res.status(200).json(variantOptionValues);
	};

	const getVariantOptionValueById: Controller["getVariantOptionValueById"] =
		async (req, res) => {
			const ability = defineAbilityFor(resolveRole(res.locals.session));

			const variantOptionValue = await svc.getById(
				ability,
				req.params.id as string,
			);

			return res.status(200).json(variantOptionValue);
		};

	const createVariantOptionValue: Controller["createVariantOptionValue"] =
		async (req, res) => {
			const ability = defineAbilityFor(resolveRole(res.locals.session));
			const input = VariantOptionValueCreateSchema.parse(req.body);

			const variantOptionValue = await svc.create(ability, input);

			return res
				.status(201)
				.location(
					`/api/v1/admin/variant-option-values/${variantOptionValue.id}`,
				)
				.json(variantOptionValue);
		};

	const updateVariantOptionValue: Controller["updateVariantOptionValue"] =
		async (req, res) => {
			const ability = defineAbilityFor(resolveRole(res.locals.session));
			const input = VariantOptionValueUpdateSchema.parse(req.body);

			const variantOptionValue = await svc.update(
				ability,
				req.params.id as string,
				input,
			);

			return res.status(200).json(variantOptionValue);
		};

	const deleteVariantOptionValue: Controller["deleteVariantOptionValue"] =
		async (req, res) => {
			const ability = defineAbilityFor(resolveRole(res.locals.session));

			await svc.delete(ability, req.params.id as string);

			return res.status(204).send();
		};

	return {
		getVariantOptionValues,
		getVariantOptionValueById,
		createVariantOptionValue,
		updateVariantOptionValue,
		deleteVariantOptionValue,
	};
}

export { controller as createVariantOptionValueController };
