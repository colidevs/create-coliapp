import { Router } from "express";
import { auth } from "@/v1/middlewares/auth";
import { demoRouter } from "@/v1/modules/demo/route";

const root = Router();

root.use("/demo", auth, demoRouter);

export { root as v1Router };
