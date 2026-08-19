import type { PropsWithChildren } from "react";

import { AppLogo } from "@/components/app-logo";
import { QueryProvider } from "@/components/providers/query-provider.client";
import { TenantSwitcher } from "@/components/tenant-switcher.client";
import { verifySession } from "@/lib/dal";

/**
 * Layout scoped to the `(console)` route group (URL-invisible) — keeps the
 * TanStack Query provider (needed by `orders/page.tsx` and its client leaves)
 * out of the root layout / Phase 1's public home page, which has no need
 * for it.
 *
 * Also mounts (Phase 4):
 * - `<AppLogo>` — the one small, real usage of the Thumbor signing pattern.
 * - `<TenantSwitcher>` — the UI trigger for `selectTenant`
 *   (`src/lib/actions/select-tenant.ts`) that didn't exist before this
 *   phase; see that component's own doc comment for why.
 *
 * Calling `verifySession()` here costs nothing extra beyond the first call
 * per request: it's wrapped in React's `cache()` (`src/lib/dal.ts`), and
 * `orders/page.tsx` (via `src/lib/api/server-client.ts`) already calls it
 * within the same request/render.
 */
export default async function ConsoleLayout({ children }: PropsWithChildren) {
	const session = await verifySession();

	return (
		<QueryProvider>
			<header className="border-kumo-line flex items-center justify-between gap-3 border-b p-4">
				<div className="flex items-center gap-3">
					<AppLogo />
					<span className="text-kumo-default font-semibold">
						{"{{name}}"} console
					</span>
				</div>
				<TenantSwitcher
					memberships={session.memberships}
					activeTenantId={session.activeTenantId}
				/>
			</header>
			{children}
		</QueryProvider>
	);
}
