import { Router } from "express";
import { categoryRouter } from "./categories/route";
import { orderRouter } from "./orders/route";
import { productImageRouter } from "./product-images/route";
import { productRouter } from "./products/route";
import { stockRouter } from "./stock/route";
import { variantOptionTypeRouter } from "./variant-option-types/route";
import { variantOptionValueRouter } from "./variant-option-values/route";
import { variantRouter } from "./variants/route";

/**
 * @description Mounted at `/api/v1/admin`, behind the Better Auth
 * session-checking `auth` middleware (`src/v1/route.ts`) — the coarse
 * check, ADR 0013's placement rule. Each module's own service layer adds
 * the fine, role-based CASL check (`src/lib/ability.ts`). `orders` (Phase 4)
 * is read-only — no create/update/delete route exists on it.
 */
const router = Router();

router.use("/categories", categoryRouter);
router.use("/products", productRouter);
router.use("/product-images", productImageRouter);
router.use("/stock", stockRouter);
router.use("/orders", orderRouter);
router.use("/variant-option-types", variantOptionTypeRouter);
router.use("/variant-option-values", variantOptionValueRouter);
router.use("/variants", variantRouter);

export { router as adminRouter };
