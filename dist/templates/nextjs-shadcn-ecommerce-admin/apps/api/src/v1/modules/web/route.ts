import { Router } from "express";
import { webCategoryRouter } from "./categories/route";
import { webProductRouter } from "./products/route";

/**
 * @description Mounted at `/api/v1/web` (`../route.ts` → `src/v1/route.ts`)
 * — public storefront reads, no Better Auth session required (matching
 * munod's own `/public` mount, which carries no `auth` middleware either).
 * Still behind `serviceAuth` (every `/api/v1` route is) — the storefront's
 * own Server Actions call this server-side, never a browser directly.
 */
const router = Router();

router.use("/categories", webCategoryRouter);
router.use("/products", webProductRouter);

export { router as webRouter };
