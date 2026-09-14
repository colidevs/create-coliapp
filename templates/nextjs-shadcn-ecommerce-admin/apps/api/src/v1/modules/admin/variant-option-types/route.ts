import { Router } from "express";
import { controller } from "./injection";

/**
 * @description Mounted at `/api/v1/admin/variant-option-types`
 * (`../route.ts` → `src/v1/route.ts`). Every route here already sits behind
 * the `auth` middleware applied once at the `/admin` mount
 * (`src/v1/route.ts`) — no per-route auth here, matching
 * `admin/categories/route.ts`'s existing convention.
 */
const router = Router();

router.get("/", controller.getVariantOptionTypes);
router.get("/:id", controller.getVariantOptionTypeById);
router.post("/", controller.createVariantOptionType);
router.patch("/:id", controller.updateVariantOptionType);
router.delete("/:id", controller.deleteVariantOptionType);

export { router as variantOptionTypeRouter };
