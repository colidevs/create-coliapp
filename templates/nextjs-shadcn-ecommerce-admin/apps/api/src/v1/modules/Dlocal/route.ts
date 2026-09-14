import { rawBodyCapture } from "@colidevs/api-kit/webhooks/express";
import { Router } from "express";
import { controller } from "./injection";

const router = Router();

router.post("/checkout", controller.createCheckout);

/**
 * @description Mounted normally, under `v1Router`'s `/dlocal` prefix
 * (`src/v1/route.ts`) — full path `/api/v1/dlocal/checkout`. This request
 * needs no raw-body handling: it is our own storefront calling us (through a
 * Next.js Server Action, per `console-golden-path.md` — the browser never
 * sees `SERVICE_KEY`), so it goes through the same `express.json()` +
 * `OpenApiValidator` + `serviceAuth` pipeline every other `/api/v1` route
 * does.
 */
export { router as dlocalRouter };

const notificationRouter = Router();

/**
 * @description dLocal's own payment-notification webhook — deliberately NOT
 * part of `dlocalRouter` above, and NOT mounted under `v1Router` at all.
 * `src/api.ts` mounts this router directly on the top-level `api` app,
 * BEFORE the global `express.json()` call, at the full path
 * `/api/v1/dlocal/notifications` (matching `config.dlocal.notificationUrl`,
 * `src/config.ts`).
 *
 * Why this can't just be a route inside `dlocalRouter`: by the time a request
 * reaches anything nested under `v1Router`, the global `express.json()` and
 * `express-openapi-validator` middleware (both mounted before `v1Router` in
 * `src/api.ts`) have already fully consumed the request stream — see
 * `@colidevs/api-kit/webhooks/express`'s `rawBodyCapture()` doc comment for
 * why a raw HMAC signature check needs the untouched byte stream. Mounting
 * this router earlier, with its own `rawBodyCapture()`, is this template's
 * only way to get dLocal's exact signed bytes.
 *
 * This bypasses `OpenApiValidator`'s request/response validation and the
 * `serviceAuth` gate (`src/v1/middlewares/service-auth.ts`) for this one
 * path — correctly so: dLocal is an external caller with no
 * `x-service-key`, and `verifyDlocalSignature` (`./signature.ts`) plus the
 * manual `DlocalNotificationSchema.parse` in `./controller.ts` are this
 * route's real validation, not `express-openapi-validator`.
 */
notificationRouter.post(
	"/notifications",
	rawBodyCapture(),
	controller.handleNotification,
);

export { notificationRouter as dlocalNotificationRouter };
