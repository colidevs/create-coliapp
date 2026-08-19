import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Membership, Session } from "@/lib/session";
import {
	ACTIVE_TENANT_COOKIE,
	resolveActiveTenantId,
	SESSION_COOKIE,
	sessionSchema,
} from "@/lib/session";

export type { Membership, Session };

export interface ActiveSession extends Session {
	/** Resolved by `resolveActiveTenantId` — the cookie's tenant if it's a real membership, else the first one. */
	activeTenantId: string;
}

// Switchable per design decision D2 (kumo-console-template SDD change): MSW is
// the default dev/test backend, including auth/session data. Nothing here may
// assume a real backend is present — API_BASE_URL points at a running
// express-ts instance once one exists; until then it resolves against the
// MSW node server wired in src/instrumentation.ts + src/mocks/node.ts.
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

/**
 * The real authorization boundary (frontend-security-auth.md's Data Access
 * Layer tier — `proxy.ts`'s cookie-presence check is only the optimistic,
 * UX-shaping fast-path). Wrapped in React's `cache()` so a single request
 * only ever looks the session up once, no matter how many Server Components
 * call it.
 *
 * Reads the httpOnly session cookie, forwards it to the mocked (or, later,
 * real) `/api/v1/session` endpoint, validates the response shape with Zod,
 * and resolves the active tenant. Redirects to `/login` whenever the session
 * is absent, the backend rejects it, or the response doesn't parse — this
 * function never returns a fixed truthy placeholder.
 *
 * **Known gap (flagged, not silently filled)**: `/login` is not yet a real
 * route in this template — there is no login flow to build in this phase
 * (Phase 2 of `kumo-console-template`; a real login page/form is explicitly
 * out of scope here). Any request that actually reaches this redirect today
 * 404s. See this phase's report for why that's a deliberate, flagged gap
 * rather than something patched over here.
 */
export const verifySession = cache(async (): Promise<ActiveSession> => {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

	if (!sessionCookie) {
		redirect("/login");
	}

	const response = await fetch(`${API_BASE_URL}/api/v1/session`, {
		headers: { cookie: `${SESSION_COOKIE}=${sessionCookie}` },
		cache: "no-store",
	});

	if (!response.ok) {
		redirect("/login");
	}

	const parsed = sessionSchema.safeParse(await response.json());

	if (!parsed.success) {
		redirect("/login");
	}

	const activeTenantId = resolveActiveTenantId(
		parsed.data,
		cookieStore.get(ACTIVE_TENANT_COOKIE)?.value,
	);

	return { ...parsed.data, activeTenantId };
});
