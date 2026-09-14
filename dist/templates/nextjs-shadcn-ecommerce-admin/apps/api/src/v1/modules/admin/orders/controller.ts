import type { Request } from "express";
import { defineAbilityFor, resolveRole } from "@/lib/ability";
import type { ResponseWithSession } from "@/v1/types";
import type { Service } from "./service";

export interface Controller {
	getOrders: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
	getOrderById: (
		req: Request,
		res: ResponseWithSession,
	) => Promise<ResponseWithSession>;
}

/**
 * @description Mounted behind the `auth` middleware at the `/admin` mount
 * (`src/v1/route.ts`), same as every other admin module. Read-only —
 * `Controller` has no `create`/`update`/`delete` handler at all, matching
 * `./route.ts`'s GET-only router.
 */
function controller(svc: Service): Controller {
	const getOrders: Controller["getOrders"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));
		const size = req.query.size ? Number(req.query.size) : undefined;
		const page = req.query.page ? Number(req.query.page) : undefined;
		const status = req.query.status ? String(req.query.status) : undefined;

		const result = await svc.get(ability, { size, page, status });

		return res.status(200).json(result);
	};

	const getOrderById: Controller["getOrderById"] = async (req, res) => {
		const ability = defineAbilityFor(resolveRole(res.locals.session));

		const order = await svc.getById(ability, req.params.id as string);

		return res.status(200).json(order);
	};

	return { getOrders, getOrderById };
}

export { controller as createOrderController };
