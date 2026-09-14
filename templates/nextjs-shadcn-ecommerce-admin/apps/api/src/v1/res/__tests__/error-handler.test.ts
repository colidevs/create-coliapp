import express from "express";
import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { v1ErrorHandler } from "@/v1/res/error-handler";
import { NotFoundHttpError, ValidationHttpError } from "@/v1/res/errors";

function appThrowing(error: unknown) {
	const app = express();

	app.get("/boom", () => {
		throw error;
	});

	app.use(v1ErrorHandler);

	return app;
}

describe("v1ErrorHandler — RFC 9457 Problem Details", () => {
	it("emits application/problem+json with type/status/title/detail/instance for an HttpError", async () => {
		const res = await supertest(appThrowing(new NotFoundHttpError("order 1")))
			.get("/boom")
			.expect(404);

		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(res.body).toMatchObject({
			type: "https://coli.dev/errors/not-found",
			status: 404,
			title: expect.stringContaining("order 1"),
			detail: expect.stringContaining("order 1"),
			instance: "/boom",
		});
	});

	it("includes the errors[] extension for a validation failure", async () => {
		const res = await supertest(
			appThrowing(
				new ValidationHttpError([
					{ field: "email", message: "must be a valid email" },
				]),
			),
		)
			.get("/boom")
			.expect(422);

		expect(res.body.errors).toEqual([
			{ field: "email", message: "must be a valid email" },
		]);
	});

	it("falls back to a 500 Problem Details body for a non-HttpError", async () => {
		const res = await supertest(appThrowing(new Error("kaboom")))
			.get("/boom")
			.expect(500);

		expect(res.headers["content-type"]).toContain("application/problem+json");
		expect(res.body).toMatchObject({
			type: "about:blank",
			status: 500,
			title: "Internal server error",
			instance: "/boom",
		});
		// Never leak the raw error message/stack in the response body.
		expect(JSON.stringify(res.body)).not.toContain("kaboom");
	});
});
