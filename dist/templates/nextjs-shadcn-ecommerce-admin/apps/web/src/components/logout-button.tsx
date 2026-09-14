"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { PropsWithClassName } from "@/types";

/** Ported (structurally) from `munod/www/src/components/logout-button.tsx`. */
export function LogoutButton({ className }: PropsWithClassName) {
	const router = useRouter();

	async function logout() {
		await authClient.signOut();
		router.push("/auth/login");
	}

	return (
		<Button
			variant="ghost"
			onClick={logout}
			className={cn("w-full justify-start", className)}
		>
			<LogOut className="size-4 text-rose-600" />
			<span>Sign out</span>
		</Button>
	);
}
