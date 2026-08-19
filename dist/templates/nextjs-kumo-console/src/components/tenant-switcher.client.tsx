"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useTransition } from "react";

import { selectTenant } from "@/lib/actions/select-tenant";
import type { Membership } from "@/lib/session";

/**
 * The UI trigger for `selectTenant` (`src/lib/actions/select-tenant.ts`) —
 * this template's protected routes had no such control until this phase,
 * which is exactly why the spec's "Tenant switch scopes data" scenario was
 * blocked on the missing `/login` route (Phase 2's own flagged gap): there
 * was nothing to sign in with, and no control to switch tenants from once
 * signed in. `selectTenant`'s own contract (a plain callable Server Action,
 * not a `useActionState` form) is unchanged — this is a new consumer of it,
 * not a modification.
 *
 * A native `<select>`, not a Kumo compound component — deliberately simple
 * for a scaffold template's own demo chrome. `router.refresh()` on success
 * re-runs the Server Component tree (`(console)/layout.tsx`,
 * `orders/page.tsx`) so the next `verifySession()` call picks up the fresh
 * `active_tenant` cookie and the orders list re-scopes — same
 * refresh-after-mutation pattern `orders-list.client.tsx` already uses.
 */
export interface TenantSwitcherProps {
	memberships: Membership[];
	activeTenantId: string;
}

export function TenantSwitcher({
	memberships,
	activeTenantId,
}: TenantSwitcherProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleChange(event: ChangeEvent<HTMLSelectElement>) {
		const tenantId = event.target.value;

		startTransition(async () => {
			const result = await selectTenant(tenantId);

			if (result.ok) {
				router.refresh();
			}
		});
	}

	return (
		<select
			aria-label="Active tenant"
			value={activeTenantId}
			onChange={handleChange}
			disabled={isPending}
			className="border-kumo-line bg-kumo-base text-kumo-default rounded border px-2 py-1 text-sm"
		>
			{memberships.map((membership) => (
				<option key={membership.tenantId} value={membership.tenantId}>
					{membership.tenantName}
				</option>
			))}
		</select>
	);
}
