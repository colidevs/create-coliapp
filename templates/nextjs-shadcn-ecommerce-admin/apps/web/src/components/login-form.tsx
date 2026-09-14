"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Ported (structurally) from `munod/www/src/components/login-form.tsx`,
 * translated to English (this template's own established UI-copy
 * convention, per the storefront port — Phase 6's `cart-button.tsx`/
 * `checkout/page.tsx`, not munod's Spanish original).
 */
export function LoginForm({ className }: { className?: string }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const { error } = await authClient.signIn.email({ email, password });
			if (error) throw error;
			router.push("/admin");
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Sign in</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleLogin}>
						<div className="flex flex-col gap-6">
							<div className="grid gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
							{error ? (
								<p className="text-destructive text-sm">{error}</p>
							) : null}
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Signing in…" : "Sign in"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
