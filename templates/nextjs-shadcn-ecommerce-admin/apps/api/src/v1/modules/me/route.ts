import { Router } from "express";
import { auth } from "@/v1/middlewares/auth";
import { getMe } from "./controller";

/**
 * @description Mounted directly at `/api/v1/me` (see `src/v1/route.ts`) —
 * the one route this template gates with the Better Auth session-checking
 * middleware. `/healthcheck` stays public per that file's own note.
 */
const me = Router();

me.get("/me", auth, getMe);

export { me as meRouter };
