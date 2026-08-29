import path from "node:path";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import type { ErrorRequestHandler, RequestHandler, Router } from "express";
import express from "express";
import * as OpenApiValidator from "express-openapi-validator";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "@/config";
import { getAuth } from "@/lib/auth";
import { healthRouter } from "@/v1/modules/health/route";
import { v1ErrorHandler } from "@/v1/res/error-handler";
import { v1Router } from "@/v1/route";

export type Version = "1";
export type ApiPath = `/api/v${Version}`;

function mountVersion(
	app: Router,
	path: ApiPath,
	router: RequestHandler,
	errorHandler: ErrorRequestHandler,
) {
	app.use(path, router);
	app.use(path, errorHandler);
}

const api = express();

// helmet: HSTS is explicitly disabled here — it belongs at the edge/infra
// layer (Cloudflare/nginx), never set by Express (ADR 0009/0010,
// `api-communication-standard.md`).
//
// `frameAncestors`/`xFrameOptions` are set EXPLICITLY, not left at helmet's
// own defaults — verified by actually inspecting helmet 8.3.0's source
// (`node_modules/helmet/index.cjs`) that its defaults are
// `frame-ancestors: 'self'` and `X-Frame-Options: SAMEORIGIN`, NOT `'none'`/
// `DENY` as ADR 0009/0010 require. A smoke test against the real app
// (`src/__tests__/api.test.ts`) caught this — asserting `DENY` failed
// against the unconfigured default.
api.use(
	helmet({
		hsts: false,
		contentSecurityPolicy: {
			directives: {
				...helmet.contentSecurityPolicy.getDefaultDirectives(),
				"frame-ancestors": ["'none'"],
			},
		},
		xFrameOptions: { action: "deny" },
	}),
);
api.disable("x-powered-by");

// CORS: explicit origin allow-list, never `*` (ADR 0009/0010).
// `CORS_ALLOWED_ORIGINS` is a comma-separated list; empty/unset means no
// browser origin is allowed by default — fail closed, not open.
api.use(
	cors({
		origin: config.cors.allowedOrigins,
	}),
);

// Rate limiting: `express-rate-limit` is the simplest default and is safe
// for a single-instance deployment. If infra confirms a multi-replica
// posture for this app, swap for `rate-limiter-flexible` with a Redis store
// instead — an in-memory limiter like this one does not share state across
// replicas.
api.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 300,
		standardHeaders: true,
		legacyHeaders: false,
	}),
);

// `/health` (process-alive, no dependency checks) + `/ready` (checks DB
// connectivity) per ADR 0009. Deliberately mounted OUTSIDE `/api/v1` and
// BEFORE the OpenAPI validator below — these are infra-facing endpoints
// (Compose HEALTHCHECK / Ansible rollout gating), not part of the
// versioned, Apidog-designed API contract.
api.use(healthRouter);

// Better Auth needs the raw, unparsed request body — mounted before
// `express.json()` below. Express 5 (path-to-regexp v6+) requires a named
// wildcard (`*splat`), not a bare `*`. `getAuth()` is called lazily, inside
// the handler, not at module-load time — see `src/lib/auth.ts`'s doc comment
// for why (this template's test suite imports this module with no
// `BETTER_AUTH_*`/`DATABASE_RUNTIME_URL` env vars set).
api.all("/api/auth/*splat", (req, res) => toNodeHandler(getAuth())(req, res));

api.use(express.json());
api.use(express.urlencoded({ extended: true }));

// express-openapi-validator: validates every /api/v1 request/response
// against the current OpenAPI spec BEFORE the route handler runs. See
// `openapi/openapi.yaml` — a scaffolded placeholder pending the real
// Apidog-exported spec (task 3.6).
api.use(
	"/api/v1",
	OpenApiValidator.middleware({
		// `__dirname` (not `import.meta.dirname`) — this template builds to
		// CJS via tsup (`tsup.config.ts`: `format: ["cjs"]`), and esbuild does
		// NOT shim `import.meta.dirname` for CJS output (it silently compiles
		// to an empty object, verified by inspecting the built `dist/api.cjs`
		// during this change — `path.resolve(undefined, ...)` would throw at
		// runtime). `__dirname` is Node's native CJS global and needs no shim.
		apiSpec: path.resolve(__dirname, "../openapi/openapi.yaml"),
		validateRequests: true,
		validateResponses: true,
	}),
);

mountVersion(api, "/api/v1", v1Router, v1ErrorHandler);

export { api };
