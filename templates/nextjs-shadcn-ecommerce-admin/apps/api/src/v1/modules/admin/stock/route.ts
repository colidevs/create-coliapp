import { Router } from "express";
import { controller } from "./injection";

/**
 * @description Read + update only — matching munod's own `stock` module
 * (no create/delete: a stock row is a projection of a product's own
 * lifecycle, never independently created or removed).
 */
const router = Router();

router.get("/", controller.getStock);
router.get("/:id", controller.getStockById);
router.patch("/:id", controller.updateStockById);

export { router as stockRouter };
