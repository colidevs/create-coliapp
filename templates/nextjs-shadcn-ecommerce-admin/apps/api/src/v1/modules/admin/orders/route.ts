import { Router } from "express";
import { controller } from "./injection";

/**
 * @description Read-only — GET only. No `POST`/`PATCH`/`DELETE`: orders are
 * created exclusively by the `dlocal-checkout` flow (`Dlocal/route.ts`) and
 * their `status` transitions exclusively via the dLocal payment-notification
 * webhook (`Dlocal/repository.ts#applyPaymentTransition`), never through this
 * admin surface.
 */
const router = Router();

router.get("/", controller.getOrders);
router.get("/:id", controller.getOrderById);

export { router as orderRouter };
