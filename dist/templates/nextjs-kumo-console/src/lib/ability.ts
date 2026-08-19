import {
	AbilityBuilder,
	createMongoAbility,
	type MongoAbility,
	type RawRuleOf,
} from "@casl/ability";

import type { Session } from "@/lib/session";

/**
 * A plausible, tenant-scoped CASL ability shape (api-rbac-signing-auth.md):
 * flat role → action mapping today, the named escalation path to
 * attribute/condition-based rules once a real need appears — not built
 * speculatively ahead of that need.
 */
export type Actions = "read" | "create" | "update" | "delete";
export type Subjects = "Order" | "Tenant";
export type AppAbility = MongoAbility<[Actions, Subjects]>;

/** The plain, JSON-serializable rule shape — what actually crosses the Server/Client boundary (see `src/components/can.tsx`). */
export type AppAbilityRule = RawRuleOf<AppAbility>;

/**
 * Builds a CASL `Ability` for one membership within `session`, scoped to
 * `activeTenantId` — never derived from a bare `(user_id, role)` pair
 * (api-rbac-signing-auth.md). Sourced entirely from the same mocked
 * session/membership data `verifySession()` (`src/lib/dal.ts`) returns; once
 * a real backend exists, this same shape reads real role assignments instead.
 *
 * This is a UI-hint builder only — see `src/components/can.tsx`'s `<Can>` for
 * where it's consumed, and `src/lib/actions/select-tenant.ts` for the actual
 * server-side enforcement this never substitutes for.
 */
export function defineAbilityFor(
	session: Pick<Session, "memberships">,
	activeTenantId: string,
): AppAbility {
	// Rename `can`/`cannot` on destructure to avoid the naming collision
	// between rule-definition and rule-checking (api-rbac-signing-auth.md).
	const { can: allow, build } = new AbilityBuilder<AppAbility>(
		createMongoAbility,
	);

	const membership = session.memberships.find(
		(m) => m.tenantId === activeTenantId,
	);

	if (!membership) {
		// No membership in the active tenant — build an ability that permits
		// nothing. Mirrors the DAL/Server Action's own reject-by-default
		// posture; the real boundary always stays server-side, never here.
		return build();
	}

	switch (membership.role) {
		case "owner":
		case "admin":
			allow(["read", "create", "update", "delete"], "Order");
			break;
		case "member":
			allow(["read", "create"], "Order");
			break;
	}

	return build();
}
