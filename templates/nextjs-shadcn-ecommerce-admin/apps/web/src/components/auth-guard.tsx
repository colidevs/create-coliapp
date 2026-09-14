"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Ported from `munod/www/src/components/auth-guard.tsx` — client-side belt
 * to the server-side `getServerSession()` → `redirect()` gate already
 * enforced in `(adm)/admin/layout.tsx` (which is the REAL boundary, per that
 * layout's own doc comment). This guard only covers the in-between case: a
 * session that becomes invalid (sign-out in another tab, token revoked)
 * while the user stays on an already-rendered admin page without a full
 * navigation re-running the server layout.
 *
 * Found live, directly by Thomas testing the pilot (same root cause as
 * `GuestGuard`'s own fix, see that file's doc comment for the Playwright
 * repro evidence): Better Auth's `useSession()` re-fetches on window focus,
 * and `isPending` goes true again on that background refetch — munod's
 * original condition blanked `children` on ANY `isPending`, remounting the
 * whole admin subtree (and any local component state in it) every time the
 * window regained focus. `hasResolvedOnce` narrows the blank/redirect-gate
 * state to the genuine first load only.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { data, isPending } = authClient.useSession();
	const hasResolvedOnce = useRef(false);

	useEffect(() => {
		if (!isPending && !data) {
			router.replace("/auth/login");
		}
	}, [isPending, data, router]);

	if (isPending && !hasResolvedOnce.current) return null;
	hasResolvedOnce.current = true;

	if (!data) return null;

	return <>{children}</>;
}
