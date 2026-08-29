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

	it("GET /api/v1/healthcheck/status passes OpenAPI validation and returns 200", async () => {
		const res = await supertest(api)
			.get("/api/v1/healthcheck/status")
			.expect(200);
		expect(res.body).toHaveProperty("msg");
	});

	it("GET /api/v1/me is gated by Better Auth's session-checking middleware and passes OpenAPI validation", async () => {
		const res = await supertest(api)
			.get("/api/v1/me")
			.set("Authorization", "Bearer some-session-token")
			.expect(200);
		expect(res.body).toEqual({ id: "usr_1", email: "jane@example.com" });
	});

	it("an undocumented /api/v1 path is rejected by the OpenAPI validator before any handler runs", async () => {
		const res = await supertest(api).get("/api/v1/definitely-not-a-real-route");
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
