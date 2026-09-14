import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

/**
 * @description Config for verifying a dLocal Go payment-notification
 * webhook's signature. Kept as its own explicit shape (design decision D5,
 * `sdd/ecommerce-admin-template/design`, Engram) rather than reusing
 * `@colidevs/api-kit`'s `tsV1SignaturePreset` — that preset assumes a
 * `ts=<epoch>,v1=<hex>` value under an `x-signature` header with a replay
 * tolerance window. dLocal Go's real wire format
 * (verified directly against `munod/api/src/v1/modules/Dlocal/signature.ts`)
 * has neither a timestamp component nor that header name, so api-kit's own
 * shipped preset is factually wrong for this provider (see
 * `sdd/ecommerce-admin-template/explore`, hefesto Engram #3669) — do not
 * reuse it here.
 */
export interface WebhookVerifyConfig {
	/**
	 * Header name to read the signature from. Node/Express lowercase every
	 * incoming header name, so this MUST be the lowercase form (e.g.
	 * `"authorization"`), never a mixed-case literal.
	 */
	headerName: string;
	/** Literal prefix preceding the hex signature within the header value. */
	scheme: string;
	/** Digest encoding the signature is expressed in — dLocal Go uses hex. */
	digest: "hex";
	/**
	 * Builds the exact string HMAC'd over, given the configured `apiKey` and
	 * the raw request body bytes. dLocal signs
	 * `HMAC-SHA256(apiKey + rawBody, apiSecret)` — no timestamp component
	 * exists, so no replay-tolerance window is expressible here. Replay
	 * defence for this template is the DB transition guard in
	 * `./repository.ts` (`WHERE status <> newStatus`), not this function.
	 */
	buildSigningPayload: (apiKey: string, rawBody: Buffer) => string;
	/** dLocal `apiSecret` — the HMAC key. */
	secret: string;
	/** dLocal `apiKey` — folded into the signed payload, not the HMAC key. */
	apiKey: string;
}

/**
 * @description Verifies a dLocal Go webhook notification's signature against
 * the exact, unparsed request body bytes (`req.rawBody`, populated by
 * `@colidevs/api-kit/webhooks/express`'s `rawBodyCapture()` — see
 * `./route.ts`). Returns `false` for every failure mode (missing body,
 * missing/malformed header, wrong scheme, length mismatch, wrong secret) —
 * deliberately uninformative to the caller about *which* check failed,
 * matching this template's existing `WebhookSignatureHttpError`'s posture
 * (`src/v1/res/errors.ts`) of never leaking why verification failed.
 */
export function verifyDlocalSignature(
	config: WebhookVerifyConfig,
	rawBody: Buffer | undefined,
	headers: IncomingHttpHeaders,
): boolean {
	if (!rawBody || rawBody.length === 0) {
		return false;
	}

	const rawHeaderValue = headers[config.headerName];
	const headerValue = Array.isArray(rawHeaderValue)
		? rawHeaderValue[0]
		: rawHeaderValue;

	if (!headerValue?.startsWith(config.scheme)) {
		return false;
	}

	const receivedHex = headerValue.slice(config.scheme.length).trim();

	const expectedHex = createHmac("sha256", config.secret)
		.update(config.buildSigningPayload(config.apiKey, rawBody))
		.digest(config.digest);

	const received = Buffer.from(receivedHex, "hex");
	const expected = Buffer.from(expectedHex, "hex");

	// Length-guarded compare FIRST — `timingSafeEqual` throws (rather than
	// returning `false`) when given buffers of different lengths, so a
	// truncated/malformed hex string must be rejected before it ever reaches
	// that call.
	if (received.length !== expected.length) {
		return false;
	}

	return timingSafeEqual(received, expected);
}
