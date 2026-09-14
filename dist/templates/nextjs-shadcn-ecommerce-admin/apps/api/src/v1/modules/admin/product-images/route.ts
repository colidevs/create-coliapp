import { Router } from "express";
import { controller } from "./injection";

/**
 * @description `GET /?productId=` matches munod's own
 * `product-images/product/:product_id` shape in spirit (list images scoped
 * to a product) via a query param instead of a nested path segment —
 * simpler routing, same capability.
 */
const router = Router();

router.get("/", controller.getProductImages);
router.get("/:id", controller.getProductImageById);
router.post("/", controller.createProductImage);
router.patch("/:id", controller.updateProductImage);
router.delete("/:id", controller.deleteProductImage);

export { router as productImageRouter };
