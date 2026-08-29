"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveSafeRedirect, SESSION_COOKIE } from "@/lib/session";

/**
 * **MSW/demo sign-in Server Action — the mock-backend counterpart, not the
 * only path anymore.** A real Better Auth flow now exists alongside this
 * one (`src/app/login/login-form.client.tsx`, `src/lib/auth-client.ts`,
 * Arc A4 of hefesto's `docs/backlog/e2e-buildable-toolset-plan.md`) —
 * `src/app/login/page.tsx` renders whichever one applies, gated on the same
 * `API_MOCKING` signal `src/instrumentation.ts` uses to start (or skip) the
 * MSW node server. This action is untouched functionally: it remains the
 * correct, honest path when `API_MOCKING=enabled` and no real backend is
 * running (the default; also what `e2e/login.spec.ts` and
 * `e2e/support.ts`'s `signInAsDemoUser` helper still exercise).
 *
 * Confirmed against `src/mocks/handlers.ts`: the MSW-mocked `/api/v1/session`
 * handler only checks the session cookie's **presence**
 * (`cookieHeader.includes("better-auth.session_token=")`), never a specific
 * value or credential. Setting any truthy value here is therefore the
 * honest, correct scope for a demo/scaffold sign-in — a username/password
 * (or any other) credential-check UI would be fake in *this* path, since
 * nothing downstream verifies it. Never fake a stronger check here — that's
 * what `login-form.client.tsx`'s real flow is for.
 *
 * Cookie attributes mirror `select-tenant.ts`'s existing
 * `ACTIVE_TENANT_COOKIE` write (httpOnly + secure + sameSite lax, per
 * frontend-security-auth.md's token/session storage convention). Written
 * under the same `SESSION_COOKIE` name the real flow's Better Auth cookie
 * uses (`src/lib/session.ts`) so `verifySession()`'s presence check
 * (`src/lib/dal.ts`) doesn't need to branch on which path set it.
 */
export async function signInDemoAction(formData: FormData): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set(SESSION_COOKIE, "demo-session", {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
	});

	const from = formData.get("from");

	redirect(resolveSafeRedirect(typeof from === "string" ? from : undefined));
}
