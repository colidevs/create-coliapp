"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Ported from `munod/www/src/components/guest-guard.tsx` — same reasoning as
 * `AuthGuard`, inverted: redirect away from the login page when a session
 * already exists.
 *
 * Found live, directly by Thomas testing the pilot: Better Auth's
 * `useSession()` re-fetches on window focus (its own client-side default,
 * confirmed via a Playwright repro — the only network activity after a
 * blur/focus cycle is a `GET /api/auth/get-session`, no page navigation at
 * all), and `isPending` flips true again during that background refetch, not
 * only on first mount. Munod's original (`isPending || data ? null : ...`)
 * blanks `children` on ANY `isPending`, which unmounts `LoginForm` and wipes
 * its local `useState` email/password on every focus regain — visually
 * indistinguishable from a full page reload, but it's a React remount, not
 * a navigation. `hasResolvedOnce` narrows the blank state to the genuine
 * first load only; a later background refetch keeps the already-rendered
 * children mounted throughout.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { data, isPending } = authClient.useSession();
	const hasResolvedOnce = useRef(false);

	useEffect(() => {
		if (!isPending && data) {
			router.replace("/admin");
		}
	}, [isPending, data, router]);

	if (isPending && !hasResolvedOnce.current) return null;
	hasResolvedOnce.current = true;

	if (data) return null;

	return <>{children}</>;
}
