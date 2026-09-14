import { Router } from "express";
import { auth } from "@/v1/middlewares/auth";
import { serviceAuth } from "@/v1/middlewares/service-auth";
import { adminRouter } from "@/v1/modules/admin/route";
import { dlocalRouter } from "@/v1/modules/Dlocal/route";
import { healthcheckRouter } from "@/v1/modules/healthcheck/route";
import { meRouter } from "@/v1/modules/me/route";
import { webRouter } from "@/v1/modules/web/route";

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
// dLocal's payment-notification webhook (`/dlocal/notifications`) is NOT
// mounted here — see `src/v1/modules/Dlocal/route.ts`'s `dlocalNotificationRouter`
// doc comment and `src/api.ts` for why it is mounted directly on the
// top-level app, before this router is ever reached.
root.use("/dlocal", dlocalRouter);
// `/admin` — every route behind BOTH `serviceAuth` above (coarse,
// service-to-service) AND `auth` (coarse, human session), matching munod's
// own real `admin/route.ts` mount (`router.use("/admin", auth,
// adminRouter)`). Fine, role-based authorization is each module's own
// service-layer CASL check (`src/lib/ability.ts`) — ADR 0013's placement
// rule; this mount adds no permission logic of its own.
root.use("/admin", auth, adminRouter);
// `/web` — public storefront reads, no `auth` middleware (no human session
// required), matching munod's own unauthenticated `/public` mount. Still
// behind `serviceAuth` above, since every `/api/v1` route is.
root.use("/web", webRouter);

export { root as v1Router };
