import { log } from "@/lib/logger";
import type { HealthcheckService } from "./types";

class Service implements HealthcheckService {
	status(): string {
		log("V1 Healthcheck Status OK ✅");
		return "V1 Healthcheck Status OK ✅";
	}
}

export const HealthcheckSvc: HealthcheckService = new Service();
