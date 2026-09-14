import { Router } from "express";
import { serviceAuth } from "@/v1/middlewares/service-auth";
import { healthcheckRouter } from "@/v1/modules/healthcheck/route";
import { meRouter } from "@/v1/modules/me/route";

const root = Router();

// Service-to-service static-key auth (`src/v1/middlewares/service-auth.ts`,
// ADR 0009's carve-out, Arc A7) gates EVERY route under `/api/v1` —
// including `/healthcheck`, which stays public only with respect to the
// per-route Better Auth session check below, not this coarser gate. This is
// deliberately mounted first, before any route-specific middleware. `/me` is
// additionally gated by the Better Auth session-checking middleware
// (`src/v1/middlewares/auth.ts`) — see `src/v1/modules/me/route.ts`. `/health`
// and `/ready` (outside `/api/v1`, mounted directly on `api`, see
// `src/api.ts`) are unaffected — this router only ever receives requests
// already under the `/api/v1` prefix.
root.use(serviceAuth);
root.use("/healthcheck", healthcheckRouter);
root.use(meRouter);

export { root as v1Router };
