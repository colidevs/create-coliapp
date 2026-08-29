import express from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/v1/middlewares/auth";
import { v1ErrorHandler } from "@/v1/res/error-handler";

/**
 * @description Isolated unit test for the Better Auth session-checking
 * middleware — `@/lib/auth`'s `getAuth()` is mocked so this suite needs no
 * real Postgres/`BETTER_AUTH_*` env vars, matching this template's other
 * `__tests__` conventions (see `src/v1/res/__tests__/error-handler.test.ts`
 * for the same "build a tiny standalone app" pattern). `vi.mock` is hoisted
 * above imports by Vitest's transform, so the `auth` import above picks up
 * the mocked module.
 */
const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
	getAuth: () => ({
		api: {
			getSession: getSessionMock,
		},
	}),
}));

function appWithAuth() {
	const app = express();

	app.get("/protected", auth, (_req, res) => {
		res.status(200).json({ ok: true });
	});
	app.use(v1ErrorHandler);

	return app;
}

describe("auth middleware — Better Auth session check", () => {
	beforeEach(() => {
		getSessionMock.mockReset();
	});

	it("calls next() and attaches the resolved session to res.locals when valid", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "sess_1" },
			user: { id: "usr_1", email: "jane@example.com" },
		});

		const res = await supertest(appWithAuth()).get("/protected").expect(200);

		expect(res.body).toEqual({ ok: true });
		expect(getSessionMock).toHaveBeenCalledTimes(1);
	});

	it("returns RFC 9457 401 Problem Details when Better Auth resolves no session", async () => {
		getSessionMock.mockResolvedValue(null);

		const res = await supertest(appWithAuth()).get("/protected");

		expect(res.status).toBe(401);
		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(res.body).toMatchObject({
			status: 401,
			type: "https://coli.dev/errors/unauthorized",
		});
	});
});
