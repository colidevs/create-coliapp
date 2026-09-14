import { Router } from "express";
import { createHealthcheckController } from "./controller";
import { HealthcheckSvc } from "./service";

const healthcheck = Router();

const controller = createHealthcheckController(HealthcheckSvc);

healthcheck.get("/status", controller.status);

export { healthcheck as healthcheckRouter };
