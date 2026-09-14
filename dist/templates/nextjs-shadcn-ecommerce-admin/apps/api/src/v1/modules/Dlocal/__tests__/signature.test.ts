import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyDlocalSignature, type WebhookVerifyConfig } from "../signature";

/**
 * @description Unit tests for the bespoke dLocal Go webhook signature
 * verification (design decision D5, `sdd/ecommerce-admin-template/design`).
 * No DB/network dependency — pure function over a `Buffer` and a headers
 * object, matching this template's other pure-function `__tests__`
 * conventions.
 */
const APP_KEY = "test-dlocal-api-key";
const APP_SECRET = "test-dlocal-api-secret";

const config: WebhookVerifyConfig = {
	headerName: "authorization",
	scheme: "V2-HMAC-SHA256, Signature: ",
	digest: "hex",
	buildSigningPayload: (apiKey, rawBody) => apiKey + rawBody.toString(),
	secret: APP_SECRET,
	apiKey: APP_KEY,
};

function sign(rawBody: Buffer, secret = APP_SECRET, apiKey = APP_KEY): string {
	return createHmac("sha256", secret)
		.update(apiKey + rawBody.toString())
		.digest("hex");
}

describe("verifyDlocalSignature", () => {
	it("accepts a valid signature over the exact raw body", () => {
		const rawBody = Buffer.from(JSON.stringify({ payment_id: "D-4-abc" }));
		const header = `V2-HMAC-SHA256, Signature: ${sign(rawBody)}`;

		expect(
			verifyDlocalSignature(config, rawBody, { authorization: header }),
		).toBe(true);
	});

	it("rejects a signature computed with the wrong secret", () => {
		const rawBody = Buffer.from(JSON.stringify({ payment_id: "D-4-abc" }));
		const header = `V2-HMAC-SHA256, Signature: ${sign(rawBody, "wrong-secret")}`;

		expect(
			verifyDlocalSignature(config, rawBody, { authorization: header }),
		).toBe(false);
	});

	it("rejects a header using the wrong scheme prefix", () => {
		const rawBody = Buffer.from(JSON.stringify({ payment_id: "D-4-abc" }));
		const header = `Bearer ${sign(rawBody)}`;

		expect(
			verifyDlocalSignature(config, rawBody, { authorization: header }),
		).toBe(false);
	});

	it("rejects a truncated hex signature (length mismatch)", () => {
		const rawBody = Buffer.from(JSON.stringify({ payment_id: "D-4-abc" }));
		const truncated = sign(rawBody).slice(0, 10);
		const header = `V2-HMAC-SHA256, Signature: ${truncated}`;

		expect(
			verifyDlocalSignature(config, rawBody, { authorization: header }),
		).toBe(false);
	});

	it("rejects when the header is missing entirely", () => {
		const rawBody = Buffer.from(JSON.stringify({ payment_id: "D-4-abc" }));

		expect(verifyDlocalSignature(config, rawBody, {})).toBe(false);
	});

	it("rejects when the raw body is missing (undefined)", () => {
		const header = `V2-HMAC-SHA256, Signature: ${sign(Buffer.from("{}"))}`;

		expect(
			verifyDlocalSignature(config, undefined, { authorization: header }),
		).toBe(false);
	});

	it("rejects when the raw body was altered after signing", () => {
		const originalBody = Buffer.from(JSON.stringify({ payment_id: "D-4-abc" }));
		const header = `V2-HMAC-SHA256, Signature: ${sign(originalBody)}`;
		const alteredBody = Buffer.from(JSON.stringify({ payment_id: "D-4-XXX" }));

		expect(
			verifyDlocalSignature(config, alteredBody, { authorization: header }),
		).toBe(false);
	});
});
