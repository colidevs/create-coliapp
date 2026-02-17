import type { Request, Response } from "express";
import { log } from "@/lib/logger";
import type { IDemoService } from "./types";

export function createDemoController(demoSvc: IDemoService) {
	log("demo controller initalized");

	async function sendDemoMessage(_: Request, res: Response) {
		const msg = demoSvc.getDemoMessage();

		return res.status(200).json({ msg });
	}

	return {
		sendDemoMessage,
	};
}
