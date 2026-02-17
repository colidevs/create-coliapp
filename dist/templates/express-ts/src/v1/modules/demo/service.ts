import { log } from "@/lib/logger";
import type { IDemoService } from "./types";

class Service implements IDemoService {
	getDemoMessage(): string {
		log("V1 demo message executed ✅");
		return "V1 demo message executed ✅";
	}
}

export const DemoSvc: IDemoService = new Service();
