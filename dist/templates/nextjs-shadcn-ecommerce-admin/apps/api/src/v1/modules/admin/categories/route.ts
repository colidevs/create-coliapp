import { Router } from "express";
import { controller } from "./injection";

/**
 * @description Mounted at `/api/v1/admin/categories` (`../route.ts` →
 * `src/v1/route.ts`). Every route here already sits behind the `auth`
 * middleware applied once at the `/admin` mount (`src/v1/route.ts`) — no
 * per-route auth here, matching munod's own `admin/categories/route.ts`.
 */
const router = Router();

router.get("/", controller.getCategories);
router.get("/:id", controller.getCategoryById);
router.post("/", controller.createCategory);
router.patch("/:id", controller.updateCategory);
router.delete("/:id", controller.deleteCategory);

export { router as categoryRouter };
