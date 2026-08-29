import { Button } from "@cloudflare/kumo";

import { signInDemoAction } from "./actions";
import { LoginForm } from "./login-form.client";

/**
 * Login page — two mutually-exclusive paths, gated on the same
 * `API_MOCKING` on/off signal `src/instrumentation.ts` uses to decide
 * whether to start the MSW node server (Arc A4, hefesto's
 * `docs/backlog/e2e-buildable-toolset-plan.md`):
 *
 * - **Real backend** (`API_MOCKING` unset/anything else): `LoginForm`
 *   (`./login-form.client.tsx`), a genuine email/password form against
 *   `templates/express-ts`'s real Better Auth (`bearer` + `emailAndPassword`,
 *   Arc A1/A2).
 * - **MSW/demo** (`API_MOCKING=enabled`, the default — unchanged from
 *   before this phase): the original "sign in as demo user" button
 *   (`./actions.ts`'s `signInDemoAction`), kept for local dev/testing
 *   without a running backend — `e2e/login.spec.ts` and
 *   `e2e/support.ts`'s `signInAsDemoUser` helper still exercise exactly
 *   this path.
 *
 * Server Component: `Button` is a flat, single-export Kumo component with
 * only serializable props, so it still renders directly here with no
 * `"use client"` leaf needed for the demo branch (console-ui-kumo.md's RSC
 * boundary rule) — `LoginForm` is its own client leaf for the real branch,
 * since it needs `useState`/`useRouter`.
 *
 * Reads `?from=` — the same param `src/proxy.ts`'s optimistic check sets
 * (`loginUrl.searchParams.set("from", request.nextUrl.pathname)`) — and
 * forwards it to whichever path renders, so both end up at the same
 * "return to where you were" destination via `resolveSafeRedirect`
 * (`src/lib/session.ts`).
 */
interface LoginPageProps {
	searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const { from } = await searchParams;
	const usingRealBackend = process.env.API_MOCKING !== "enabled";

	return (
		<main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-8">
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-2xl font-semibold">Sign in</h1>
				{usingRealBackend ? (
					<p className="text-kumo-subtle max-w-sm text-sm">
						Sign in with an account registered against this template's own
						express-ts backend.
					</p>
				) : (
					<p className="text-kumo-subtle max-w-sm text-sm">
						Demo sign-in only — API_MOCKING is enabled, so this uses the
						MSW-mocked session instead of a real backend. Signing in grants a
						session for the fixed demo user (memberships in two tenants) for
						local development and testing.
					</p>
				)}
			</div>
			{usingRealBackend ? (
				<LoginForm from={from ?? ""} />
			) : (
				<form action={signInDemoAction}>
					<input type="hidden" name="from" value={from ?? ""} />
					<Button type="submit" variant="primary">
						Sign in as demo user
					</Button>
				</form>
			)}
		</main>
	);
}
