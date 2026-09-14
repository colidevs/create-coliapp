import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Ported (near-verbatim) from `munod/www/src/app/api/session/route.ts` —
 * closes the gap `src/lib/auth-client.ts` (Phase 5) flagged: bridges the
 * bearer token (`localStorage`-only, browser-side — `apps/web` and
 * `apps/api` are two separate deployables, ADR 0022/0036's cross-root-domain
 * escape hatch) into an httpOnly cookie on `apps/web`'s OWN domain. This
 * cookie never leaves `apps/web`'s server: only `src/lib/
 * get-server-session.ts` reads it, forwarding its value as an
 * `Authorization: Bearer <token>` header in a server-to-server call to
 * `apps/api`. This is what lets `(adm)/admin/layout.tsx` (a Server
 * Component) know whether a real session exists BEFORE rendering/fetching
 * anything — the same real leak munod's own `layout.tsx` comment documents
 * closing (18 admin pages that used to ship real data to zero-auth
 * requests, because the only check that existed was client-side).
 */
export async function POST(request: Request) {
	const { token } = (await request.json()) as { token?: string };

	if (!token) {
		return NextResponse.json({ error: "token required" }, { status: 400 });
	}

	const response = NextResponse.json({ ok: true });
	response.cookies.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7, // matches Better Auth's default 7-day session
	});
	return response;
}

export async function DELETE() {
	const response = NextResponse.json({ ok: true });
	response.cookies.delete(SESSION_COOKIE_NAME);
	return response;
}
