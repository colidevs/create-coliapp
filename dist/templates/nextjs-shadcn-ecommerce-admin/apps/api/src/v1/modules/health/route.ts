import { Router } from "express";
import { getHealth, getReady } from "./controller";

/**
 * @description Mounted at the app root (not under `/api/v1`) and before the
 * OpenAPI validator — `/health`/`/ready` are infra-facing endpoints (Compose
 * `HEALTHCHECK`, Ansible rollout gating), not part of the versioned,
 * Apidog-designed API contract (ADR 0009).
 */
const health = Router();

health.get("/health", getHealth);
health.get("/ready", getReady);

export { health as healthRouter };
