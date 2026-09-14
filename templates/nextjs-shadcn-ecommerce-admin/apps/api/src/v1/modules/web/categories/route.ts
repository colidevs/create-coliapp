import { Router } from "express";
import { controller } from "./injection";

const router = Router();

router.get("/", controller.getCategories);

export { router as webCategoryRouter };
