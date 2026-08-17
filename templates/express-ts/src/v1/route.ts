import { Router } from "express";
// NOTE (pre-existing, flagged during Phase 1 apply, fixed here): this file
// used to import `auth` (`@/v1/middlewares/auth`) but never wired it to any
// route — `noUnusedLocals` (tsconfig.json) now rejects that dead import now
// that the `RequestWithId` fix (task 3.1's neighboring cleanup) let
// `tsc --noEmit` get this far in the first place. `/healthcheck` is
// intentionally left public (an operator/orchestrator must reach it without
// credentials); `auth` stays available in `@/v1/middlewares/auth` for the
// next real, tenant-scoped module to import and apply per-route, per ADR
// 0013's middleware-coarse placement.
import { healthcheckRouter } from "@/v1/modules/healthcheck/route";

const root = Router();

root.use("/healthcheck", healthcheckRouter);

export { root as v1Router };
