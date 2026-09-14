import "server-only";

import { cookies } from "next/headers";

import { env } from "@/env";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Ported from munod (`munod/www/src/lib/get-server-session.ts`). Server-only:
 * validates the session against `apps/api` on every call (not just "a cookie
 * exists") — a stale/invalidated bearer token must not grant access. This is
 * a server-to-server fetch (`apps/web` → `apps/api`), so CORS (browser-only)
 * does not apply here.
 *
 * Hits `apps/api`'s `/api/auth/get-session` (Better Auth's own REST
 * endpoint, mounted at the app root, NOT under `/api/v1` — see
 * `apps/api/src/api.ts`'s `api.all("/api/auth/*splat", ...)`), forwarding
 * the bridged bearer token as an `Authorization: Bearer` header — the
 * counterpart of `src/lib/auth-client.ts`'s session bridge.
 */
export async function getServerSession() {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

	if (!token) return null;

	const res = await fetch(`${env.API_BASE_URL}/api/auth/get-session`, {
		headers: { Authorization: `Bearer ${token}` },
		cache: "no-store",
	});

	if (!res.ok) return null;

	const session = await res.json();
	return session ?? null;
}
