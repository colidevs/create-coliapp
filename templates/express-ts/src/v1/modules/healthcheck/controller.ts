import type { Request, Response } from "express";
import { log } from "@/lib/logger";
import type { HealthcheckService } from "./types";

export function createHealthcheckController(svc: HealthcheckService) {
	log("healthcheck controller initalized");

	async function status(_: Request, res: Response) {
		const msg = svc.status();

		return res.status(200).json({ msg });
	}

	return {
		status,
	};
}
