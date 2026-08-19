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
 * Matches Phase 3's actual protected route: `orders` mounted at `/orders`
 * under `src/app/(console)/orders/page.tsx` (a Next.js route group —
 * `(console)` contributes no path segment). `/dashboard` was Phase 2's
 * placeholder prefix, since no protected page existed yet at that point;
 * updated now that one does, per that comment's own instruction. Extend this
 * list rather than leaving it stale whenever a new protected route group
 * mounts under `(console)`.
 */
export const config = {
	matcher: ["/orders/:path*"],
};
