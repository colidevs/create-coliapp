import { Router } from "express";
import { categoryRouter } from "./categories/route";
import { productImageRouter } from "./product-images/route";
import { productRouter } from "./products/route";
import { stockRouter } from "./stock/route";

/**
 * @description Mounted at `/api/v1/admin`, behind the Better Auth
 * session-checking `auth` middleware (`src/v1/route.ts`) — the coarse
 * check, ADR 0013's placement rule. Each module's own service layer adds
 * the fine, role-based CASL check (`src/lib/ability.ts`). `admin/orders`
 * (Phase 4) is NOT wired here yet — deferred to its own stacked PR.
 */
const router = Router();

router.use("/categories", categoryRouter);
router.use("/products", productRouter);
router.use("/product-images", productImageRouter);
router.use("/stock", stockRouter);

export { router as adminRouter };
