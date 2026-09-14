import type { Request, Response } from "express";
import type { Service } from "./service";

export interface Controller {
	getCategories: (req: Request, res: Response) => Promise<Response>;
}

function controller(svc: Service): Controller {
	const getCategories: Controller["getCategories"] = async (_req, res) => {
		const categories = await svc.getActive();

		return res.status(200).json(categories);
	};

	return { getCategories };
}

export { controller as createWebCategoryController };
