import { Router } from "express";
import { healthcheckRouter } from "@/v1/modules/healthcheck/route";

const root = Router();

root.use("/healthcheck", healthcheckRouter);

export { root as v1Router };
