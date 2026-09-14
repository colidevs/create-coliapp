import {
	AbilityBuilder,
	createMongoAbility,
	type MongoAbility,
	type RawRuleOf,
} from "@casl/ability";

/**
 * UI-hint-only CASL ability (`.claude/rules/frontend-security-auth.md`'s
 * "CASL on the frontend: UI hint, never a boundary") — a fresh module, NOT
 * shared with `apps/api/src/lib/ability.ts` (server-side, service-layer
 * enforcement). Two separate deployables in this monorepo with no shared
 * package (ADR 0029, no speculative `packages/*` entry), so the same
 * subject/action/role vocabulary is deliberately duplicated here rather than
 * imported — do not conflate or dedupe the two modules.
 *
 * Mirrors `apps/api`'s own subjects and grants exactly (design decision,
 * `sdd/ecommerce-admin-template/design`): every catalog subject grants
 * `"viewer"` a `"read"` action; `"Order"` carries buyer PII and is granted to
 * `"admin"` only, matching `apps/api`'s own asymmetric `Order` grant.
 *
 * This never substitutes for the real boundary — every create/update/delete
 * Server Action still hits `apps/api`, which re-validates via its own
 * `assertCan` at the service layer regardless of what this ability permits
 * client-side.
 */
export type CatalogAction = "manage" | "create" | "read" | "update" | "delete";
export type CatalogSubject =
	| "Category"
	| "Product"
	| "ProductImage"
	| "Stock"
	| "Order";
export type CatalogAbility = MongoAbility<[CatalogAction, CatalogSubject]>;
export type CatalogRole = "admin" | "viewer";

/** The plain, JSON-serializable rule shape — what crosses the Server/Client boundary (see `src/components/can.tsx`). */
export type CatalogAbilityRule = RawRuleOf<CatalogAbility>;

export function defineAbilityFor(role: CatalogRole): CatalogAbility {
	// Rename `can`/`cannot` on destructure to avoid the naming collision
	// between rule-definition and rule-checking (api-rbac-signing-auth.md).
	const { can: allow, build } = new AbilityBuilder<CatalogAbility>(
		createMongoAbility,
	);

	if (role === "admin") {
		allow("manage", "Category");
		allow("manage", "Product");
		allow("manage", "ProductImage");
		allow("manage", "Stock");
		allow("read", "Order");
	} else {
		allow("read", "Category");
		allow("read", "Product");
		allow("read", "ProductImage");
		allow("read", "Stock");
	}

	return build();
}
