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
 * request's own `Authorization` header — not one static client shared
 * across every request (which would defeat RLS role-switching, since
 * PostgREST resolves the Postgres role from the JWT it receives). Runs a
 * REAL local HTTP server standing in for PostgREST, echoing back the
 * `Authorization` header it actually received on each call, and a REAL
 * Express app + supertest making two requests with two different tenant
 * tokens.
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

	it("forwards each request's own Authorization header, never a single shared token", async () => {
		vi.stubEnv("POSTGREST_URL", baseUrl);

		const { attachPostgrestClient } = await import("@/lib/postgrest/express");

		const app = express();
		app.use(attachPostgrestClient);
		app.get("/orders", async (_req, res) => {
			const { data } = await (
				res.locals as {
					postgrest: import("@supabase/postgrest-js").PostgrestClient;
				}
			).postgrest
				.from("orders")
				.select("*");

			res.status(200).json(data);
		});

		await supertest(app)
			.get("/orders")
			.set("Authorization", "Bearer tenant-a-jwt")
			.expect(200);

		await supertest(app)
			.get("/orders")
			.set("Authorization", "Bearer tenant-b-jwt")
			.expect(200);

		expect(receivedAuthHeaders).toEqual([
			"Bearer tenant-a-jwt",
			"Bearer tenant-b-jwt",
		]);

		vi.unstubAllEnvs();
	});

	it("throws EnvironmentError instead of silently defaulting when POSTGREST_URL is unset", async () => {
		vi.stubEnv("POSTGREST_URL", "");

		const { createPostgrestClientForRequest } = await import(
			"@/lib/postgrest/client"
		);

		expect(() => createPostgrestClientForRequest("Bearer x")).toThrow();

		vi.unstubAllEnvs();
	});
});
