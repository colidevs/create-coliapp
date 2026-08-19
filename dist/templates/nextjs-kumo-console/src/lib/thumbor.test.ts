import { buildThumborUrl } from "@colidevs/thumbor-client";
import { describe, expect, it } from "vitest";

/**
 * Verifies `@colidevs/thumbor-client`'s `buildThumborUrl` — the function
 * `src/lib/thumbor.ts`'s `server-only`-guarded wrapper calls — actually
 * produces a well-formed, signed URL string, per this phase's spec
 * requirement. Deliberately targets the package's own exported function
 * directly (a pure function, no `server-only` involved) rather than the
 * wrapper: `thumbor.ts` imports `"server-only"`, which throws when evaluated
 * outside Next's react-server module graph — including under Vitest — the
 * same reason `src/lib/dal.ts` has no direct unit test either
 * (`src/lib/session.ts`'s doc comment explains the same constraint).
 */
describe("buildThumborUrl", () => {
	it("produces a well-formed, signed absolute URL", () => {
		const url = buildThumborUrl({
			path: "branding/app-logo.png",
			securityKey: "test-security-key",
			baseUrl: "https://images.colidevs.com",
			size: { width: 40, height: 40 },
			crop: { mode: "smart" },
			quality: 80,
		});

		expect(url.startsWith("https://images.colidevs.com/")).toBe(true);
		expect(url).toContain("40x40");
		expect(url).toContain("smart");
		expect(url).toContain("filters:quality(80)");
		expect(url.endsWith("branding/app-logo.png")).toBe(true);

		// Signature segment: base64url-alphabet (plus retained `=` padding —
		// the package's own doc comment: it deliberately does NOT strip padding
		// the way Node's built-in "base64url" encoding does, to match Thumbor's
		// own Python `base64.urlsafe_b64encode` reference behavior), non-empty,
		// and distinct per operations path (the whole point of signing) —
		// asserted without hardcoding the exact signature, which would just
		// re-implement HMAC-SHA1 here.
		const [, signature] = new URL(url).pathname.split("/");
		expect(signature.length).toBeGreaterThan(0);
		expect(signature).toMatch(/^[A-Za-z0-9_=-]+$/);

		const differentPathUrl = buildThumborUrl({
			path: "branding/other-logo.png",
			securityKey: "test-security-key",
			baseUrl: "https://images.colidevs.com",
		});
		const [, otherSignature] = new URL(differentPathUrl).pathname.split("/");
		expect(otherSignature).not.toBe(signature);
	});
});
