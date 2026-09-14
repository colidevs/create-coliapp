import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";
import { StockUpdateSchema } from "./types";

export interface Controller {
	getStock: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getStockById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	updateStockById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
}

function controller(svc: Service): Controller {
	const getStock: Controller["getStock"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const size = req.query.size ? Number(req.query.size) : undefined;
		const page = req.query.page ? Number(req.query.page) : undefined;

		const items = await svc.get(ability, { size, page });

		return res.status(200).json(items);
	};

	const getStockById: Controller["getStockById"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const item = await svc.getById(ability, req.params.id as string);

		return res.status(200).json(item);
	};

	const updateStockById: Controller["updateStockById"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const input = StockUpdateSchema.parse(req.body);

		const item = await svc.update(ability, req.params.id as string, input);

		return res.status(200).json(item);
	};

	return { getStock, getStockById, updateStockById };
}

export { controller as createStockController };
