import { Router } from "express";
import { controller } from "./injection";

const router = Router();

router.get("/", controller.getProducts);
router.get("/:slug", controller.getProductBySlug);

export { router as webProductRouter };
