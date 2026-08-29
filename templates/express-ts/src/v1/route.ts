import { Router } from "express";
import { healthcheckRouter } from "@/v1/modules/healthcheck/route";
import { meRouter } from "@/v1/modules/me/route";

const root = Router();

// `/healthcheck` is intentionally left public (an operator/orchestrator must
// reach it without credentials). `/me` is gated by the Better Auth
// session-checking middleware (`src/v1/middlewares/auth.ts`) — see
// `src/v1/modules/me/route.ts`.
root.use("/healthcheck", healthcheckRouter);
root.use(meRouter);

export { root as v1Router };
