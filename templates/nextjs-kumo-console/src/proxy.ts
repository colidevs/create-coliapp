import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

/**
 * Next.js 16's renamed request-interception file (formerly `middleware.ts` —
 * confirmed against the installed `next@16.3.1` package itself:
 * `node_modules/next/dist/lib/constants.js` defines both `MIDDLEWARE_FILENAME
 * = 'middleware'` (still resolved, deprecated) and `PROXY_FILENAME = 'proxy'`
 * side by side, and `node_modules/next/dist/build/utils.js` treats
 * `(src/)?proxy` as an alias location for the same mechanism). The exported
 * function is renamed the same way, per Next's own migration doc
 * (`nextjs.org/docs/messages/middleware-to-proxy`): `middleware` → `proxy`.
 *
 * This is the **optimistic Proxy check** only (frontend-security-auth.md /
 * Next's own authentication guide) — cookie-presence, UX-shaping fast-path.
 * It is not, and must never become, the real authorization boundary; that is
 * `verifySession()` (`src/lib/dal.ts`), re-validated at the actual
 * data-access point. A layout-level `return null` auth check is the named,
 * forbidden anti-pattern this two-tier split exists to avoid.
 */
export function proxy(request: NextRequest): NextResponse {
	const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

	if (!hasSessionCookie) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("from", request.nextUrl.pathname);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

/**
 * Provisional matcher: Phase 2 ships no protected page of its own yet — the
 * existing `/` home page stays public (Phase 1 skeleton). `/dashboard` is a
 * placeholder prefix for whatever protected route Phase 3's `orders` module
 * mounts under; update this matcher when that module lands rather than
 * leaving it stale.
 */
export const config = {
	matcher: ["/dashboard/:path*"],
};
