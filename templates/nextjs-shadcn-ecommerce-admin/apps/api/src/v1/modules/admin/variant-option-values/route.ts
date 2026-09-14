import { Router } from "express";
import { controller } from "./injection";

/**
 * @description Mounted at `/api/v1/admin/variant-option-values`
 * (`../route.ts` → `src/v1/route.ts`). `GET /?optionTypeId=` scopes the
 * list to one option type's values — same shape as `admin/product-images`'s
 * `?productId=` filter. Every route here already sits behind the `auth`
 * middleware applied once at the `/admin` mount (`src/v1/route.ts`) — no
 * per-route auth here, matching every existing admin route module.
 */
const router = Router();

router.get("/", controller.getVariantOptionValues);
router.get("/:id", controller.getVariantOptionValueById);
router.post("/", controller.createVariantOptionValue);
router.patch("/:id", controller.updateVariantOptionValue);
router.delete("/:id", controller.deleteVariantOptionValue);

export { router as variantOptionValueRouter };
