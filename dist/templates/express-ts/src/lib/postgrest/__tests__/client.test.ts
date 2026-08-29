import { createServer, type Server } from "node:http";
import express from "express";
import supertest from "supertest";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

/**
 * @description Proves the PostgREST client is built PER REQUEST from that
 * request's own PostgREST-verifiable JWT — not one static client shared
 * across every request (which would defeat RLS role-switching, since
 * PostgREST resolves the Postgres role from the JWT it receives), and NOT
 * the raw, opaque `Authorization` header the client sent to authenticate
 * with THIS app (Arc A3 correction, proposed — see `src/lib/auth.ts`:
 * Better Auth's `bearer` plugin issues opaque session tokens, which
 * PostgREST cannot verify).
 *
 * Runs a REAL local HTTP server standing in for PostgREST, echoing back the
 * `Authorization` header it actually received on each call, and a REAL
 * Express app + supertest making requests through the same middleware chain
 * production routes use: `auth` (mocked Better Auth) then
 * `attachPostgrestClient`.
 */
describe("createPostgrestClientForRequest / attachPostgrestClient", () => {
	let mockPostgrest: Server;
	let receivedAuthHeaders: Array<string | undefined> = [];
	let baseUrl: string;

	beforeAll(async () => {
		mockPostgrest = createServer((req, res) => {
			receivedAuthHeaders.push(req.headers.authorization);
			res.setHeader("content-type", "application/json");
			res.end(
				JSON.stringify([{ authorization: req.headers.authorization ?? null }]),
			);
		});

		await new Promise<void>((resolve) => {
			mockPostgrest.listen(0, "127.0.0.1", resolve);
		});

		const address = mockPostgrest.address();

		if (!address || typeof address === "string") {
			throw new Error("expected the mock PostgREST server to bind a port");
		}

		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve, reject) => {
			mockPostgrest.close((error) => (error ? reject(error) : resolve()));
		});
	});

	beforeEach(() => {
		receivedAuthHeaders = [];
		vi.resetModules();
	});

	async function ordersHandler(
		_req: express.Request,
		res: express.Response,
	): Promise<void> {
		const { data } = await (
			res.locals as {
				postgrest: import("@supabase/postgrest-js").PostgrestClient;
			}
		).postgrest
			.from("orders")
			.select("*");

		res.status(200).json(data);
	}

	it("mints a fresh per-request PostgREST client from a valid session's JWT — never a shared token", async () => {
		vi.stubEnv("POSTGREST_URL", baseUrl);

		const getSessionMock = vi.fn().mockResolvedValue({
			session: { id: "sess_1" },
			user: { id: "usr_1", email: "jane@example.com" },
		});
		const getTokenMock = vi
			.fn()
			.mockResolvedValueOnce({ token: "tenant-a-jwt" })
			.mockResolvedValueOnce({ token: "tenant-b-jwt" });

		vi.doMock("@/lib/auth", () => ({
			getAuth: () => ({
				api: { getSession: getSessionMock, getToken: getTokenMock },
			}),
		}));

		const { auth } = await import("@/v1/middlewares/auth");
		const { attachPostgrestClient } = await import("@/lib/postgrest/express");

		const app = express();
		app.get("/orders", auth, attachPostgrestClient, ordersHandler);

		await supertest(app)
			.get("/orders")
			.set("Authorization", "Bearer opaque-bearer-session-token")
			.expect(200);
		await supertest(app)
			.get("/orders")
			.set("Authorization", "Bearer opaque-bearer-session-token")
			.expect(200);

		// The mock PostgREST server received the session-minted JWTs, never
		// the opaque bearer token the client authenticated this app with.
		expect(receivedAuthHeaders).toEqual([
			"Bearer tenant-a-jwt",
			"Bearer tenant-b-jwt",
		]);

		vi.unstubAllEnvs();
		vi.doUnmock("@/lib/auth");
	});

	it("builds an unauthenticated (anon-role) PostgREST client when no auth middleware ran", async () => {
		vi.stubEnv("POSTGREST_URL", baseUrl);

		const { attachPostgrestClient } = await import("@/lib/postgrest/express");

		const app = express();
		app.get("/orders", attachPostgrestClient, ordersHandler);

		await supertest(app).get("/orders").expect(200);

		expect(receivedAuthHeaders).toEqual([undefined]);

		vi.unstubAllEnvs();
	});

	it("throws EnvironmentError instead of silently defaulting when POSTGREST_URL is unset", async () => {
		vi.stubEnv("POSTGREST_URL", "");

		const { createPostgrestClientForRequest } = await import(
			"@/lib/postgrest/client"
		);

		expect(() => createPostgrestClientForRequest("some.jwt.token")).toThrow();

		vi.unstubAllEnvs();
	});
});
