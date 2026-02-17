import { Router } from "express";
import { createDemoController } from "./controller";
import { DemoSvc } from "./service";

const demoRouter = Router();

const controller = createDemoController(DemoSvc);

demoRouter.get("/", controller.sendDemoMessage);

export { demoRouter };
