import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import {
	VariantOptionTypeCreateSchema,
	VariantOptionTypeUpdateSchema,
} from "./types";

export interface Controller {
	getVariantOptionTypes: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getVariantOptionTypeById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	createVariantOptionType: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateVariantOptionType: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	deleteVariantOptionType: (
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
	const getVariantOptionTypes: Controller["getVariantOptionTypes"] = async (
		_req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const variantOptionTypes = await svc.get(ability);

		return res.status(200).json(variantOptionTypes);
	};

	const getVariantOptionTypeById: Controller["getVariantOptionTypeById"] =
		async (req, res) => {
			const ability = defineAbilityFor(resolveRole(res.locals.session));

			const variantOptionType = await svc.getById(
				ability,
				req.params.id as string,
			);

			return res.status(200).json(variantOptionType);
		};

	const createVariantOptionType: Controller["createVariantOptionType"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = VariantOptionTypeCreateSchema.parse(req.body);

		const variantOptionType = await svc.create(ability, input);

		return res
			.status(201)
			.location(`/api/v1/admin/variant-option-types/${variantOptionType.id}`)
			.json(variantOptionType);
	};

	const updateVariantOptionType: Controller["updateVariantOptionType"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = VariantOptionTypeUpdateSchema.parse(req.body);

		const variantOptionType = await svc.update(
			ability,
			req.params.id as string,
			input,
		);

		return res.status(200).json(variantOptionType);
	};

	const deleteVariantOptionType: Controller["deleteVariantOptionType"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		await svc.delete(ability, req.params.id as string);

		return res.status(204).send();
	};

	return {
		getVariantOptionTypes,
		getVariantOptionTypeById,
		createVariantOptionType,
		updateVariantOptionType,
		deleteVariantOptionType,
	};
}

export { controller as createVariantOptionTypeController };
