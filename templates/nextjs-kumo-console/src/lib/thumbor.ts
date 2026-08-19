import "server-only";

import {
	buildThumborUrl,
	type ThumborOperations,
} from "@colidevs/thumbor-client";

/**
 * Server-only Thumbor URL signing wrapper (design decision D5,
 * frontend-performance-tooling.md). `@colidevs/thumbor-client` is zero-dep
 * and ADR 0001-compliant for a Kumo console (never `@colidevs/ui`'s
 * shadcn-track `ThumborImage`).
 *
 * `import "server-only"` (frontend-security-auth.md) is the structural
 * guard here, not just this doc comment: `THUMBOR_SECURITY_KEY` is read from
 * a server-only env var (never `NEXT_PUBLIC_*`), and this function's only
 * job is handing the package's own `buildThumborUrl` that key plus a source
 * path. Call this only from a Server Component or Route Handler — never
 * from a `next/image` custom `loader`, which runs in the browser bundle and
 * would leak the key (the package's own mandatory, documented constraint).
 *
 * `buildThumborUrl` itself is a pure function (no env-var reads of its
 * own beyond the optional `baseUrl` default) — see `src/lib/thumbor.test.ts`
 * for the direct, server-only-free unit test of that package function.
 * This wrapper is intentionally *not* unit tested itself, for the same
 * reason `src/lib/dal.ts` isn't: the `server-only` marker throws when its
 * module is evaluated outside Next's react-server module graph, including
 * under plain Vitest.
 */
export function buildSignedThumborUrl(
	path: string,
	operations?: ThumborOperations,
): string {
	const securityKey = process.env.THUMBOR_SECURITY_KEY;

	if (!securityKey) {
		throw new Error(
			"THUMBOR_SECURITY_KEY is not set — see .env.example. A real value comes from Infisical in a real deployment.",
		);
	}

	return buildThumborUrl({
		path,
		securityKey,
		baseUrl: process.env.THUMBOR_BASE_URL,
		...operations,
	});
}
