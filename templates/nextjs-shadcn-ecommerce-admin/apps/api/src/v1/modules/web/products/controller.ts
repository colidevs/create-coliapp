import type { Request, Response } from "express";
import type { Service } from "./service";

export interface Controller {
	getProducts: (req: Request, res: Response) => Promise<Response>;
	getProductBySlug: (req: Request, res: Response) => Promise<Response>;
}

function controller(svc: Service): Controller {
	const getProducts: Controller["getProducts"] = async (req, res) => {
		const size = req.query.size ? Number(req.query.size) : undefined;
		const page = req.query.page ? Number(req.query.page) : undefined;
		const categoryId = req.query.categoryId
			? String(req.query.categoryId)
			: undefined;
		const q = req.query.q ? String(req.query.q) : undefined;

		const result = await svc.getActive({ size, page, categoryId, q });

		return res.status(200).json(result);
	};

	const getProductBySlug: Controller["getProductBySlug"] = async (req, res) => {
		const { slug } = req.params;

		const product = await svc.getActiveBySlug(slug as string);

		return res.status(200).json(product);
	};

	return { getProducts, getProductBySlug };
}

export { controller as createWebProductController };
