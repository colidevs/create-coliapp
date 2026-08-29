import supertest from "supertest";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/api";

// `@/lib/auth` is mocked to a resolved session here (unlike the 401 case
// covered in `src/__tests__/adr-audit-regression.test.ts` and
// `src/v1/middlewares/__tests__/auth.test.ts`) so `GET /api/v1/me` below can
// exercise the full, real app — including `express-openapi-validator`
// validating the response against `openapi/openapi.yaml` — without a real
// Postgres/`BETTER_AUTH_*` env. `getToken` (Arc A3, proposed — see
// `src/lib/auth.ts`) is mocked alongside `getSession` since `auth` now
// calls it right after a valid session is resolved.
vi.mock("@/lib/auth", () => ({
	getAuth: () => ({
		api: {
			getSession: vi.fn().mockResolvedValue({
				session: { id: "sess_1" },
				user: { id: "usr_1", email: "jane@example.com" },
			}),
			getToken: vi.fn().mockResolvedValue({ token: "signed.jwt.token" }),
		},
	}),
}));

// Arc A7's service-to-service static-key gate (`src/v1/middlewares/
// service-auth.ts`) applies to every `/api/v1` route. `vitest.config.ts`
// sets `SERVICE_KEY=test-service-key` in `process.env` before this (or any)
// test file's modules are evaluated, so `@/config`'s `serviceAuth.key`
// resolves to this same value here — no mocking needed for the happy path.
const VALID_SERVICE_KEY = "test-service-key";

/**
 * @description End-to-end smoke test for the full middleware chain wired in
 * `src/api.ts` (task 3.7/3.9): helmet, CORS, rate limiting, `/health`+
 * `/ready`, express-openapi-validator, and the RFC 9457 error handler — all
 * mounted together, exercised against the real Express app (via supertest),
 * not individually mocked. Doubles as a regression guard for the specific
 * 2026-08-17 audit findings this phase closes (task 3.9).
 */
describe("api — full middleware chain", () => {
	it("GET /health is always 200, no dependency checks", async () => {
		const res = await supertest(api).get("/health").expect(200);
		expect(res.body).toEqual({ status: "ok" });
	});

	it("GET /ready reports DB connectivity (503 when unreachable in this test env)", async () => {
		const res = await supertest(api).get("/ready");
		expect([200, 503]).toContain(res.status);
		expect(res.body.checks).toHaveProperty("db");
	});

	it("GET /api/v1/healthcheck/status passes OpenAPI validation and returns 200 with a valid service key", async () => {
		const res = await supertest(api)
			.get("/api/v1/healthcheck/status")
			.set("x-service-key", VALID_SERVICE_KEY)
			.expect(200);
		expect(res.body).toHaveProperty("msg");
	});

	it("GET /api/v1/healthcheck/status 401s with no service key, even though it is a public/unauthenticated route otherwise", async () => {
		// The service-key gate (Arc A7) is coarser than and independent of any
		// per-route auth — `/healthcheck/status` is public with respect to
		// Better Auth (openapi.yaml's `security: []`), but still gated by
		// `src/v1/middlewares/service-auth.ts`, mounted on `v1Router` ahead of
		// every route.
		const res = await supertest(api).get("/api/v1/healthcheck/status");
		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
	});

	it("GET /api/v1/me is gated by Better Auth's session-checking middleware AND the service key, and passes OpenAPI validation", async () => {
		// Cookie, not `Authorization: Bearer` — the OpenAPI spec's
		// `sessionCookie` scheme (Arc A6's real-flow fix, 2026-08-29) matches
		// how `src/v1/middlewares/auth.ts` actually authenticates (Better
		// Auth's own session cookie, via `fromNodeHeaders`), not a bearer
		// token. Found live: the original `bearerAuth` scheme made every real
		// cookie-authenticated request 401 at the validator layer, before
		// Better Auth's own check ever ran.
		const res = await supertest(api)
			.get("/api/v1/me")
			.set("Cookie", "better-auth.session_token=some-session-token")
			.set("x-service-key", VALID_SERVICE_KEY)
			.expect(200);
		expect(res.body).toEqual({ id: "usr_1", email: "jane@example.com" });
	});

	it("GET /api/v1/me 401s with a valid session but a missing service key (Arc A7 — both factors required together)", async () => {
		const res = await supertest(api)
			.get("/api/v1/me")
			.set("Cookie", "better-auth.session_token=some-session-token");

		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
	});

	it("GET /api/v1/me 401s with a valid session but an invalid service key", async () => {
		const res = await supertest(api)
			.get("/api/v1/me")
			.set("Cookie", "better-auth.session_token=some-session-token")
			.set("x-service-key", "wrong-key");

		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
	});

	it("GET /api/v1/me 401s with a valid service key but no session", async () => {
		const res = await supertest(api)
			.get("/api/v1/me")
			.set("x-service-key", VALID_SERVICE_KEY);

		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
	});

	it("an undocumented /api/v1 path is rejected by the OpenAPI validator before any handler runs", async () => {
		const res = await supertest(api)
			.get("/api/v1/definitely-not-a-real-route")
			.set("x-service-key", VALID_SERVICE_KEY);
		expect(res.status).toBe(404);
	});

	it("sets helmet security headers with HSTS explicitly disabled (edge/infra layer owns HSTS, ADR 0009/0010)", async () => {
		const res = await supertest(api).get("/health");
		expect(res.headers["x-frame-options"]).toBe("DENY");
		expect(res.headers["strict-transport-security"]).toBeUndefined();
		expect(res.headers["x-powered-by"]).toBeUndefined();
	});

	it("rejects a browser Origin not on the CORS allow-list", async () => {
		const res = await supertest(api)
			.get("/health")
			.set("Origin", "https://not-allowed.example.com");
		expect(res.headers["access-control-allow-origin"]).toBeUndefined();
	});
});
