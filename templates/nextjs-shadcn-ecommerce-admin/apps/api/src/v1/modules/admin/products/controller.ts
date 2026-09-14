import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import { ProductCreateSchema, ProductUpdateSchema } from "./types";

export interface Controller {
	getProducts: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getProductById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	createProduct: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateProduct: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	deleteProduct: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
}

function controller(svc: Service): Controller {
	const getProducts: Controller["getProducts"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const size = req.query.size ? Number(req.query.size) : undefined;
		const page = req.query.page ? Number(req.query.page) : undefined;
		const categoryId = req.query.categoryId
			? String(req.query.categoryId)
			: undefined;
		const q = req.query.q ? String(req.query.q) : undefined;

		const result = await svc.get(ability, { size, page, categoryId, q });

		return res.status(200).json(result);
	};

	const getProductById: Controller["getProductById"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const product = await svc.getById(ability, req.params.id as string);

		return res.status(200).json(product);
	};

	const createProduct: Controller["createProduct"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = ProductCreateSchema.parse(req.body);

		const product = await svc.create(ability, input);

		return res
			.status(201)
			.location(`/api/v1/admin/products/${product.id}`)
			.json(product);
	};

	const updateProduct: Controller["updateProduct"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = ProductUpdateSchema.parse(req.body);

		const product = await svc.update(ability, req.params.id as string, input);

		return res.status(200).json(product);
	};

	const deleteProduct: Controller["deleteProduct"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		await svc.delete(ability, req.params.id as string);

		return res.status(204).send();
	};

	return {
		getProducts,
		getProductById,
		createProduct,
		updateProduct,
		deleteProduct,
	};
}

export { controller as createProductController };
