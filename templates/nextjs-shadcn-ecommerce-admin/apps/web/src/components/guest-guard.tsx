"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Ported from `munod/www/src/components/guest-guard.tsx` — same reasoning as
 * `AuthGuard`, inverted: redirect away from the login page when a session
 * already exists.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { data, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && data) {
			router.replace("/admin");
		}
	}, [isPending, data, router]);

	if (isPending || data) return null;

	return <>{children}</>;
}
