"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/session";

/**
 * Demo sign-in Server Action — the Phase 2-deferred `/login` route this
 * phase must build (Thomas's explicit decision, confirmed mid-change).
 * There is still no real backend auth: `templates/express-ts` ships only
 * HTTP Basic Auth — no Better Auth, no session/token issuance, no
 * credential-verification endpoint of any kind (the same "V2" finding
 * `select-tenant.ts`/`server-client.ts` already cite).
 *
 * Confirmed against `src/mocks/handlers.ts`: the MSW-mocked `/api/v1/session`
 * handler only checks the session cookie's **presence**
 * (`cookieHeader.includes("session_id=")`), never a specific value or
 * credential. Setting any truthy value here is therefore the honest, correct
 * scope for a demo/scaffold sign-in — a username/password (or any other)
 * credential-check UI would be fake, since nothing downstream verifies it.
 * Swap this for a real sign-in flow (Better Auth, per
 * `.claude/rules/backend-template-stack.md`) once that backend work lands —
 * never fake a stronger check here in the meantime.
 *
 * Cookie attributes mirror `select-tenant.ts`'s existing
 * `ACTIVE_TENANT_COOKIE` write (httpOnly + secure + sameSite lax, per
 * frontend-security-auth.md's token/session storage convention).
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

	// Only ever redirect to a same-origin relative path. Rejects an absolute
	// URL and a protocol-relative one (`//evil.example`, which browsers
	// resolve as scheme-relative) — `proxy.ts`'s own `from` param is always a
	// same-origin pathname (`request.nextUrl.pathname`), but this action must
	// not trust that invariant blindly since `from` arrives as ordinary,
	// client-suppliable form data.
	const destination =
		typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
			? from
			: "/orders";

	redirect(destination);
}
