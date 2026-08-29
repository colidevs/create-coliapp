import express from "express";
import supertest from "supertest";
import { describe, expect, it, vi } from "vitest";
import { serviceAuth } from "@/v1/middlewares/service-auth";
import { v1ErrorHandler } from "@/v1/res/error-handler";

/**
 * @description Isolated unit test for the service-to-service static-key
 * middleware (Arc A7 of hefesto's `docs/backlog/e2e-buildable-toolset-plan.md`)
 * — `@/config` is mocked to a fixed expected key so this suite is
 * independent of `vitest.config.ts`'s global `SERVICE_KEY` test env value,
 * matching this template's other `__tests__` conventions (see
 * `src/v1/middlewares/__tests__/auth.test.ts` for the same "build a tiny
 * standalone app" pattern).
 */
vi.mock("@/config", () => ({
	config: { serviceAuth: { key: "expected-service-key" } },
}));

function appWithServiceAuth() {
	const app = express();

	app.get("/protected", serviceAuth, (_req, res) => {
		res.status(200).json({ ok: true });
	});
	app.use(v1ErrorHandler);

	return app;
}

describe("serviceAuth middleware — static service-key check", () => {
	it("calls next() when a valid x-service-key header is provided", async () => {
		const res = await supertest(appWithServiceAuth())
			.get("/protected")
			.set("x-service-key", "expected-service-key");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
	});

	it("returns RFC 9457 401 Problem Details when the header is missing", async () => {
		const res = await supertest(appWithServiceAuth()).get("/protected");

		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(res.body).toMatchObject({
			status: 401,
			type: "https://coli.dev/errors/unauthorized",
		});
	});

	it("returns RFC 9457 401 Problem Details when the header value does not match", async () => {
		const res = await supertest(appWithServiceAuth())
			.get("/protected")
			.set("x-service-key", "wrong-key");

		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
	});
});
