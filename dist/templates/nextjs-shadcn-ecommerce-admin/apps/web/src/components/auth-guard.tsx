"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Ported from `munod/www/src/components/auth-guard.tsx` — client-side belt
 * to the server-side `getServerSession()` → `redirect()` gate already
 * enforced in `(adm)/admin/layout.tsx` (which is the REAL boundary, per that
 * layout's own doc comment). This guard only covers the in-between case: a
 * session that becomes invalid (sign-out in another tab, token revoked)
 * while the user stays on an already-rendered admin page without a full
 * navigation re-running the server layout.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { data, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && !data) {
			router.replace("/auth/login");
		}
	}, [isPending, data, router]);

	if (isPending || !data) return null;

	return <>{children}</>;
}
