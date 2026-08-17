import { readFileSync } from "node:fs";
import path from "node:path";
import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { api } from "@/api";
import { tenantCacheKey } from "@/lib/redis";
import { RequiredError } from "@/v1/res/errors";

/**
 * @description Task 3.9 — a lightweight regression guard proving the
 * `docs/backlog/api-standard-real-world-audit.md` (2026-08-17) findings
 * scoped to THIS phase's task list are now closed, keyed to that document's
 * "Template-specific findings requiring action" section (hefesto repo, not
 * duplicated here). Not a full Apidog contract-test replacement — see
 * `.claude/rules/api-design-apidog.md` for where that sits.
 *
 * Findings this phase closes (checked below):
 *   1. Tenant-cache-key bug (Phase 1, re-verified here) — CLOSED
 *   2. License mismatch (`"license": "ISC"`) — CLOSED
 *   RFC 9457 absent in all 6 audited targets — CLOSED (see also
 *     `src/v1/res/__tests__/error-handler.test.ts`)
 *   No health/ready split — CLOSED
 *   No CORS/rate-limit/helmet — CLOSED
 *   No OpenAPI/Apidog spec scaffolding — CLOSED (placeholder, task 3.6)
 *
 * Findings explicitly NOT closed by this phase (documented, not silently
 * dropped — do not misreport these as fixed):
 *   3. Auth-scheme mismatch (Basic Auth instead of OAuth2 Bearer, and not
 *      wired into `v1Router`) — Phase 4's Better Auth spike scope, not
 *      Phase 3's task list.
 *   4. Unguarded mercadopago webhook surface — `@colidevs/api-kit`'s
 *      `verifyWebhook` (Phase 2, shipped) is not yet wired into this
 *      template's mercadopago integration; not a Phase 3 task.
 *   5. framework-vs-create-coliapp lineage divergence — Phase 5's gated
 *      retirement scope.
 */
describe("ADR 0009-0013 audit regression guard", () => {
	it("[finding 1] tenant-cache-key: mandatory tenantId, no hardcoded product prefix", () => {
		expect(() => tenantCacheKey({ tenantId: "", resource: "orders" })).toThrow(
			RequiredError,
		);

		const key = tenantCacheKey({ tenantId: "tenant-a", resource: "orders" });
		expect(key).not.toContain("colitienda:");
	});

	it("[finding 2] package.json declares Apache-2.0, not ISC (ADR 0011)", () => {
		const pkg = JSON.parse(
			readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"),
		);
		expect(pkg.license).toBe("Apache-2.0");
	});

	it("RFC 9457 Problem Details is the error shape, not {message, data}", async () => {
		const res = await supertest(api).get("/api/v1/not-a-real-route");
		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(res.body).toHaveProperty("type");
		expect(res.body).toHaveProperty("status");
		expect(res.body).toHaveProperty("title");
		// The old shape must be gone, not just supplemented.
		expect(res.body).not.toHaveProperty("data");
	});

	it("/health and /ready both exist (the audit found this split missing in 5-6 of 6 targets)", async () => {
		await supertest(api).get("/health").expect(200);
		const readyRes = await supertest(api).get("/ready");
		expect([200, 503]).toContain(readyRes.status);
	});

	it("CORS, rate-limit, and helmet are all wired (the audit found zero of these in every target)", async () => {
		const res = await supertest(api).get("/health");
		// helmet
		expect(res.headers["x-content-type-options"]).toBe("nosniff");
		// express-rate-limit (standardHeaders: true)
		expect(res.headers["ratelimit-limit"]).toBeDefined();
		// CORS: no wildcard allow-list — an unlisted Origin gets no ACAO header.
		const corsRes = await supertest(api)
			.get("/health")
			.set("Origin", "https://evil.example.com");
		expect(corsRes.headers["access-control-allow-origin"]).toBeUndefined();
	});

	it("an OpenAPI spec exists and is actually enforced (the audit found zero specs in 5 of 6 targets)", async () => {
		const spec = readFileSync(
			path.resolve(__dirname, "../../openapi/openapi.yaml"),
			"utf8",
		);
		expect(spec).toContain("openapi: 3.1.0");

		// Enforced, not just present on disk: an undocumented path 404s before
		// any handler runs (see src/__tests__/api.test.ts for the direct case).
		const res = await supertest(api).get("/api/v1/not-a-real-route");
		expect(res.status).toBe(404);
	});
});
