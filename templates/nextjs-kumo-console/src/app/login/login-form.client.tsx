"use client";

import { Button } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { resolveSafeRedirect } from "@/lib/session";

export interface LoginFormProps {
	from: string;
}

/**
 * The REAL sign-in form (Arc A4) — email/password against
 * `templates/express-ts`'s `emailAndPassword` Better Auth plugin, via
 * `src/lib/auth-client.ts`'s `signIn.email()`. Rendered by
 * `src/app/login/page.tsx` only when `API_MOCKING !== "enabled"` (a real
 * backend is configured); the MSW/demo path
 * (`src/app/login/actions.ts`'s `signInDemoAction`) still renders otherwise,
 * unchanged.
 *
 * `signIn.email()` sets Better Auth's own httpOnly session cookie directly
 * (same-origin/same-root-domain assumption, `src/lib/auth-client.ts`'s own
 * doc comment) — this component never touches `document.cookie` or any
 * client-readable storage itself. On success it round-trips to wherever
 * `?from=` (set by `src/proxy.ts`'s optimistic redirect) pointed, exactly
 * like `signInDemoAction` already did — `resolveSafeRedirect`
 * (`src/lib/session.ts`) is the same open-redirect guard, shared rather
 * than reimplemented here.
 *
 * `router.refresh()` after `router.push()` re-runs the Server Component
 * tree so the next `verifySession()` call (`src/lib/dal.ts`) picks up the
 * freshly-set session cookie — same refresh-after-mutation pattern
 * `tenant-switcher.client.tsx` already uses for `selectTenant()`.
 */
export function LoginForm({ from }: LoginFormProps) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const { error: signInError } = await authClient.signIn.email({
			email,
			password,
		});

		setIsSubmitting(false);

		if (signInError) {
			setError(signInError.message ?? "Sign in failed.");
			return;
		}

		router.push(resolveSafeRedirect(from));
		router.refresh();
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex w-full max-w-sm flex-col gap-4"
		>
			<div className="flex flex-col gap-1">
				<label htmlFor="email" className="text-kumo-default text-sm">
					Email
				</label>
				<input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="border-kumo-line bg-kumo-base text-kumo-default rounded border px-3 py-2 text-sm"
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label htmlFor="password" className="text-kumo-default text-sm">
					Password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className="border-kumo-line bg-kumo-base text-kumo-default rounded border px-3 py-2 text-sm"
				/>
			</div>
			{error ? (
				<p role="alert" className="text-sm text-red-600">
					{error}
				</p>
			) : null}
			<Button type="submit" variant="primary" disabled={isSubmitting}>
				{isSubmitting ? "Signing in…" : "Sign in"}
			</Button>
		</form>
	);
}
