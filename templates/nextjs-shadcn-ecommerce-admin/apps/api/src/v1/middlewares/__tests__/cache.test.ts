import express from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cache } from "@/v1/middlewares/cache";
import type { ResponseWithCacheContext } from "@/v1/types";

/**
 * @description Regression coverage for the `adr0012.tenant-safe-caching`
 * finding fixed in this change (`api-standard/findings.json`): the cache
 * middleware's `resolveTenantId()` used to trust the raw, client-controlled
 * `x-tenant-id` request header. It now reads `res.locals.tenantId`, which
 * only the `auth` middleware sets, from the authenticated session's
 * `organization` plugin's `activeOrganizationId`
 * (`src/v1/middlewares/auth.ts`, `src/lib/auth.ts`).
 *
 * `@/lib/redis` is mocked so this suite needs no real Redis connection —
 * same "isolated unit test, mock the external dependency" convention as
 * `auth.test.ts`. `tenantCacheKey` is mocked as a passthrough so assertions
 * can inspect exactly which `tenantId` reached it.
 */
const { getCacheMock, setCacheMock, tenantCacheKeyMock } = vi.hoisted(() => ({
	getCacheMock: vi.fn(),
	setCacheMock: vi.fn(),
	tenantCacheKeyMock: vi.fn(
		({ tenantId, resource, dims }: Record<string, unknown>) =>
			`key:${tenantId}:${resource}:${(dims as unknown[])?.join(",")}`,
	),
}));

vi.mock("@/lib/redis", () => ({
	getCache: getCacheMock,
	setCache: setCacheMock,
	tenantCacheKey: tenantCacheKeyMock,
}));

/**
 * @description Builds a tiny standalone app wiring the cache middleware
 * behind a test-only setup middleware that seeds `res.locals` exactly the
 * way `auth` + `context` would on a real route (`auth` runs first — see
 * `resolveTenantId`'s own doc comment) — this suite tests `cache.ts` in
 * isolation, not the full middleware chain.
 */
function appWithCache(locals: Partial<ResponseWithCacheContext["locals"]>) {
	const app = express();

	app.get(
		"/resources/:id",
		(_req, res: ResponseWithCacheContext, next) => {
			Object.assign(res.locals, locals);
			next();
		},
		cache,
		(_req, res) => {
			res.status(200).json({ handlerRan: true });
		},
	);

	return app;
}

describe("cache middleware — resolveTenantId reads the authenticated session, never the header", () => {
	beforeEach(() => {
		getCacheMock.mockReset();
		setCacheMock.mockReset();
		tenantCacheKeyMock.mockClear();
	});

	it("ignores a spoofed x-tenant-id header when res.locals.tenantId (session-derived) is unset", async () => {
		const app = appWithCache({ context: "widgets" });

		await supertest(app)
			.get("/resources/abc")
			.set("x-tenant-id", "attacker-controlled-tenant")
			.expect(200);

		// Cache is skipped entirely (fail-closed) — no tenantId means no cache
		// lookup, regardless of what the header claimed.
		expect(tenantCacheKeyMock).not.toHaveBeenCalled();
		expect(getCacheMock).not.toHaveBeenCalled();
	});

	it("builds the cache key from res.locals.tenantId, never from the x-tenant-id header, when both are present and disagree", async () => {
		getCacheMock.mockResolvedValue(null);

		const app = appWithCache({
			context: "widgets",
			tenantId: "real-authenticated-tenant",
		});

		await supertest(app)
			.get("/resources/abc")
			.set("x-tenant-id", "attacker-controlled-tenant")
			.expect(200);

		expect(tenantCacheKeyMock).toHaveBeenCalledWith(
			expect.objectContaining({ tenantId: "real-authenticated-tenant" }),
		);
		expect(getCacheMock).toHaveBeenCalledWith(
			"key:real-authenticated-tenant:widgets:abc,/resources/abc",
		);
	});

	it("serves a cache hit built from the session-derived tenantId", async () => {
		getCacheMock.mockResolvedValue({ id: "abc", name: "widget" });

		const app = appWithCache({
			context: "widgets",
			tenantId: "real-authenticated-tenant",
		});

		const res = await supertest(app).get("/resources/abc").expect(200);

		expect(res.body).toMatchObject({
			data: { id: "abc", name: "widget" },
			message: "cache hit",
		});
	});
});
