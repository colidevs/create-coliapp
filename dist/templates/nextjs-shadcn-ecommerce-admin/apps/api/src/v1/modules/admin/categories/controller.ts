import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import { CategoryCreateSchema, CategoryUpdateSchema } from "./types";

export interface Controller {
	getCategories: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getCategoryById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	createCategory: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateCategory: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	deleteCategory: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
}

/**
 * @description Mounted behind the `auth` middleware at the `/admin` mount
 * (`src/v1/route.ts`), so `res.locals.session` is always set by the time a
 * handler here runs. `resolveRole`/`defineAbilityFor`
 * (`src/lib/ability.ts`) build the CASL ability for this request; the
 * service layer is what actually enforces it (ADR 0013 placement rule) —
 * this controller never checks permissions itself.
 */
function controller(svc: Service): Controller {
	const getCategories: Controller["getCategories"] = async (_req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const categories = await svc.get(ability);

		return res.status(200).json(categories);
	};

	const getCategoryById: Controller["getCategoryById"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const category = await svc.getById(ability, req.params.id as string);

		return res.status(200).json(category);
	};

	const createCategory: Controller["createCategory"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = CategoryCreateSchema.parse(req.body);

		const category = await svc.create(ability, input);

		return res
			.status(201)
			.location(`/api/v1/admin/categories/${category.id}`)
			.json(category);
	};

	const updateCategory: Controller["updateCategory"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = CategoryUpdateSchema.parse(req.body);

		const category = await svc.update(ability, req.params.id as string, input);

		return res.status(200).json(category);
	};

	const deleteCategory: Controller["deleteCategory"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		await svc.delete(ability, req.params.id as string);

		return res.status(204).send();
	};

	return {
		getCategories,
		getCategoryById,
		createCategory,
		updateCategory,
		deleteCategory,
	};
}

export { controller as createCategoryController };
