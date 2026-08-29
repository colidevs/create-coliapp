import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Membership, MeResponse, Session } from "@/lib/session";
import {
	ACTIVE_TENANT_COOKIE,
	API_BASE_URL,
	meResponseSchema,
	resolveActiveTenantId,
	SESSION_COOKIE,
	sessionFromMeResponse,
	sessionSchema,
} from "@/lib/session";

export type { Membership, Session };

export interface ActiveSession extends Session {
	/** Resolved by `resolveActiveTenantId` — the cookie's tenant if it's a real membership, else the first one. */
	activeTenantId: string;
}

/**
 * The real authorization boundary (frontend-security-auth.md's Data Access
 * Layer tier — `proxy.ts`'s cookie-presence check is only the optimistic,
 * UX-shaping fast-path). Wrapped in React's `cache()` so a single request
 * only ever looks the session up once, no matter how many Server Components
 * call it.
 *
 * Reads the httpOnly session cookie and forwards it to one of two backends,
 * gated by the same `API_MOCKING` on/off signal `src/instrumentation.ts`
 * already uses to decide whether to start the MSW node server (design
 * decision D2 stays in force — MSW remains a fully supported dev/test
 * option, not replaced):
 *
 * - **MSW/mock** (`API_MOCKING=enabled`, the default): `/api/v1/session`,
 *   MSW-mocked (`src/mocks/handlers.ts`), validated against the full
 *   multi-tenant `sessionSchema`.
 * - **Real backend** (`API_MOCKING` unset/anything else, Arc A4 —
 *   hefesto's `docs/backlog/e2e-buildable-toolset-plan.md`): `/api/v1/me`,
 *   `templates/express-ts`'s real Better Auth-gated route (Arc A1/A2),
 *   validated against `meResponseSchema` and mapped onto the same `Session`
 *   shape via `sessionFromMeResponse` — see that function's own doc comment
 *   in `src/lib/session.ts` for the disclosed personal-workspace
 *   placeholder this uses pending Arc A3's real tenant/membership data.
 *
 * Either way, this function redirects to `/login` whenever the session
 * cookie is absent, the backend rejects it, or the response doesn't parse —
 * it never returns a fixed truthy placeholder. `/login` is now a real route
 * (`src/app/login/page.tsx`), closing the gap this doc comment used to flag.
 */
export const verifySession = cache(async (): Promise<ActiveSession> => {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

	if (!sessionCookie) {
		redirect("/login");
	}

	const usingRealBackend = process.env.API_MOCKING !== "enabled";
	const endpoint = usingRealBackend ? "/api/v1/me" : "/api/v1/session";

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		headers: { cookie: `${SESSION_COOKIE}=${sessionCookie}` },
		cache: "no-store",
	});

	if (!response.ok) {
		redirect("/login");
	}

	const body: unknown = await response.json();
	const parsed = usingRealBackend
		? meResponseSchema.safeParse(body)
		: sessionSchema.safeParse(body);

	if (!parsed.success) {
		redirect("/login");
	}

	const session: Session = usingRealBackend
		? sessionFromMeResponse(parsed.data as MeResponse)
		: (parsed.data as Session);

	const activeTenantId = resolveActiveTenantId(
		session,
		cookieStore.get(ACTIVE_TENANT_COOKIE)?.value,
	);

	return { ...session, activeTenantId };
});
