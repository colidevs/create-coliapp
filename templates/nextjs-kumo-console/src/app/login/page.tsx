import { Button } from "@cloudflare/kumo";

import { signInDemoAction } from "./actions";

/**
 * Demo sign-in page — the Phase 2-deferred `/login` route this phase must
 * build. Server Component: `Button` is a flat, single-export Kumo component
 * with only serializable props, so it renders directly here with no
 * `"use client"` leaf needed (console-ui-kumo.md's RSC boundary rule).
 *
 * Reads `?from=` — the same param `src/proxy.ts`'s optimistic check sets
 * (`loginUrl.searchParams.set("from", request.nextUrl.pathname)`) — and
 * round-trips it through a hidden form field so `signInDemoAction`
 * (`./actions.ts`) can redirect back to wherever the user was headed, per
 * Next's own "return to where you were" pattern for a login page reached via
 * proxy redirect.
 *
 * See `./actions.ts`'s own doc comment for why this is an honest
 * "sign in as demo user" button and not an invented credential-check UI —
 * no code change is possible here that would make a username/password field
 * anything other than decorative until a real backend exists.
 */
interface LoginPageProps {
	searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const { from } = await searchParams;

	return (
		<main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-8">
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-2xl font-semibold">Sign in</h1>
				<p className="text-kumo-subtle max-w-sm text-sm">
					Demo sign-in only — this scaffold template has no real backend auth
					yet. Signing in grants a session for the fixed demo user (memberships
					in two tenants) for local development and testing.
				</p>
			</div>
			<form action={signInDemoAction}>
				<input type="hidden" name="from" value={from ?? ""} />
				<Button type="submit" variant="primary">
					Sign in as demo user
				</Button>
			</form>
		</main>
	);
}
