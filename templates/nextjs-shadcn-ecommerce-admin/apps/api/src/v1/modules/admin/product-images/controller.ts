import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import { ProductImageCreateSchema, ProductImageUpdateSchema } from "./types";

export interface Controller {
	getProductImages: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getProductImageById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	createProductImage: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateProductImage: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	deleteProductImage: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
}

function controller(svc: Service): Controller {
	const getProductImages: Controller["getProductImages"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const productId = req.query.productId
			? String(req.query.productId)
			: undefined;
		const variantId = req.query.variantId
			? String(req.query.variantId)
			: undefined;

		const images = await svc.get(ability, { productId, variantId });

		return res.status(200).json(images);
	};

	const getProductImageById: Controller["getProductImageById"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const image = await svc.getById(ability, req.params.id as string);

		return res.status(200).json(image);
	};

	const createProductImage: Controller["createProductImage"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = ProductImageCreateSchema.parse(req.body);

		const image = await svc.create(ability, input);

		return res
			.status(201)
			.location(`/api/v1/admin/product-images/${image.id}`)
			.json(image);
	};

	const updateProductImage: Controller["updateProductImage"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = ProductImageUpdateSchema.parse(req.body);

		const image = await svc.update(ability, req.params.id as string, input);

		return res.status(200).json(image);
	};

	const deleteProductImage: Controller["deleteProductImage"] = async (
		req,
		res,
	) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		await svc.delete(ability, req.params.id as string);

		return res.status(204).send();
	};

	return {
		getProductImages,
		getProductImageById,
		createProductImage,
		updateProductImage,
		deleteProductImage,
	};
}

export { controller as createProductImageController };
