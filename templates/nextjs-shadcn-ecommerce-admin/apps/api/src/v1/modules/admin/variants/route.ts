import { Router } from "express";
import { controller } from "./injection";

/**
 * @description Mounted at `/api/v1/admin/variants` (`../route.ts` →
 * `src/v1/route.ts`). `GET /?productId=` scopes the list to one product's
 * variants — same shape as `admin/product-images`'s `?productId=` filter.
 * Every route here already sits behind the `auth` middleware applied once
 * at the `/admin` mount (`src/v1/route.ts`) — no per-route auth here,
 * matching every existing admin route module.
 */
const router = Router();

router.get("/", controller.getVariants);
router.get("/:id", controller.getVariantById);
router.post("/", controller.createVariant);
router.patch("/:id", controller.updateVariant);
router.delete("/:id", controller.deleteVariant);

export { router as variantRouter };
