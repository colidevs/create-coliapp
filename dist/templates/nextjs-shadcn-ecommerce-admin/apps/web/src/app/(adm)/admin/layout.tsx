import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { AppAbilityProvider } from "@/components/can";
import { QueryProvider } from "@/components/providers/query-provider";
import { ReturnLink } from "@/components/return-link";
import { ThemeProvider } from "@/components/theme-provider";
import { defineAbilityFor } from "@/lib/ability";
import { getServerSession } from "@/lib/get-server-session";
import { AppSidebar } from "./app-sidebar";

/**
 * ADR 0032's one mandatory console obligation (`.claude/rules/
 * frontend-seo.md`, "Track split — general web vs. Kumo console"): a
 * `noindex` directive on the admin route group. Additive to, not a
 * replacement for, `app/robots.ts`'s existing `/admin` disallow rule
 * (Phase 5, task 5.9) — the disallow rule stops well-behaved crawlers from
 * fetching this route at all; this metadata is the fallback for one that
 * ignores `robots.txt` (or already has the URL indexed from before).
 */
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function AdminRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Server-side gate: `redirect()` aborts rendering entirely before any
	// child page's own data fetch runs. Ported from munod's real
	// `(adm)/admin/layout.tsx` — its own comment records the real leak this
	// closes: without it, every admin page fetched real data unconditionally
	// and a client-side-only guard (`AuthGuard`, below) only hid the DOM
	// after the fact, shipping the RSC payload to anyone who requested the
	// page directly. Unlike munod (whose auth server moved to a different
	// root domain, forcing a client-only check), this template's
	// `getServerSession()` (Phase 5) already validates server-side against
	// `apps/api` via the bridged bearer cookie (`src/app/api/session/
	// route.ts`, this batch) — so the full, real boundary is available here.
	const session = await getServerSession();
	if (!session) {
		redirect("/auth/login");
	}

	// Mirrors `apps/api/src/lib/ability.ts`'s own documented seam
	// (`resolveRole` always returns `"admin"` — no per-user role column
	// exists yet, PR3b's own note): the frontend ability is UI-hint-only
	// (`.claude/rules/frontend-security-auth.md`) and carries the identical
	// fixed resolution, not a new gap.
	const rules = defineAbilityFor("admin").rules;

	return (
		<AuthGuard>
			<AppAbilityProvider rules={rules}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<QueryProvider>
						<div className="flex min-h-svh w-full">
							<AppSidebar />
							<div className="flex flex-1 flex-col overflow-auto">
								<ReturnLink />
								<main className="flex-1 overflow-auto px-8 py-6">
									{children}
								</main>
							</div>
						</div>
					</QueryProvider>
				</ThemeProvider>
			</AppAbilityProvider>
		</AuthGuard>
	);
}
