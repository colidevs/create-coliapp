import type { Request, Response } from "express";
import { checkDbConnectivity } from "./service";

/** @description Process-alive only, no dependency checks (ADR 0009). Always 200. */
export async function getHealth(_req: Request, res: Response) {
	res.status(200).json({ status: "ok" });
}

/** @description Checks DB connectivity (ADR 0009). 503 when the dependency is down. */
export async function getReady(_req: Request, res: Response) {
	const dbOk = await checkDbConnectivity();

	if (!dbOk) {
		return res
			.status(503)
			.json({ status: "not_ready", checks: { db: "down" } });
	}

	res.status(200).json({ status: "ready", checks: { db: "ok" } });
}
