import {
	AbilityBuilder,
	createMongoAbility,
	ForbiddenError,
	type MongoAbility,
} from "@casl/ability";
import { ForbiddenHttpError } from "@/v1/res/errors";

/**
 * @description `admin-catalog-crud` domain (Phase 3b). ADR 0013's recommended
 * RBAC library (`.claude/rules/api-rbac-signing-auth.md`) — flat, role-based
 * only, no object/tenant-ownership dimension, since this template's 4 new
 * tables (`src/lib/db/schema.ts`) carry no `tenant_id` column at all (design
 * decision A4, `sdd/ecommerce-admin-template/design`) and there is no
 * per-record ownership concept for a catalog resource.
 *
 * Placement follows ADR 0013's rule exactly: the `auth` middleware
 * (`src/v1/middlewares/auth.ts`) is the COARSE check — is there a valid
 * Better Auth session at all, gating the whole `/admin` mount
 * (`src/v1/route.ts`). This module is the FINE check, applied inside each
 * admin module's `service.ts` — can THIS role perform THIS action on THIS
 * subject. Never enforced in a controller.
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

/**
 * @description `"Order"` (Phase 4, `admin-catalog-crud` "Order
 * administration" requirement) is deliberately NOT granted to `"viewer"` at
 * all — every other catalog subject grants `"viewer"` a `"read"` action, but
 * orders carry buyer PII (`mail`/`buyerInfo`, `admin/orders/types.ts`), so
 * even read access is restricted to `"admin"` only. `admin/orders`'s own
 * module is read-only regardless (no create/update/delete route exists), so
 * `"read"` is the only action ever asserted against `"Order"` — granting
 * `"manage"` here would be a misleading capability signal for a subject with
 * no write endpoint to actually exercise it.
 */
export function defineAbilityFor(role: CatalogRole): CatalogAbility {
	const { can, build } = new AbilityBuilder<CatalogAbility>(createMongoAbility);

	if (role === "admin") {
		can("manage", "Category");
		can("manage", "Product");
		can("manage", "ProductImage");
		can("manage", "Stock");
		can("read", "Order");
	} else {
		can("read", "Category");
		can("read", "Product");
		can("read", "ProductImage");
		can("read", "Stock");
	}

	return build();
}

/**
 * @description Resolves the CASL role for an authenticated Better Auth
 * session. This template ships no per-user role column at all — Better
 * Auth's core schema (`user`/`session`/`account`/`verification`) has none,
 * and the `admin` plugin (which would add one) is not wired
 * (`src/lib/auth.ts`). Every session that already passed the coarse `auth`
 * middleware gate is therefore granted `"admin"` here — this mirrors
 * munod's own real admin-panel gate, which is session-presence-only with no
 * granular roles at all (`(adm)/admin/layout.tsx`'s `getServerSession()` →
 * `redirect()` check, `sdd/ecommerce-admin-template/design`).
 *
 * This is the one, deliberately narrow seam a project needing more than one
 * admin role would touch: add a `role` column (or wire Better Auth's `admin`
 * plugin) and branch on it here — never re-plumb every module's service
 * layer, which already depends only on the `CatalogAbility` this function
 * produces, not on how the role was resolved.
 */
export function resolveRole(_session: unknown): CatalogRole {
	return "admin";
}

/**
 * @description The one seam every admin module's `service.ts` calls before a
 * write — converts CASL's own `ForbiddenError` (a plain `Error` subclass,
 * not this app's `HttpError`) into the shared RFC 9457
 * `ForbiddenHttpError` (`src/v1/res/errors.ts`), so `v1ErrorHandler`
 * (`src/v1/res/error-handler.ts`) shapes a CASL denial exactly like every
 * other error in this app — never a second, ad hoc error-shaping path.
 */
export function assertCan(
	ability: CatalogAbility,
	action: CatalogAction,
	subject: CatalogSubject,
): void {
	try {
		ForbiddenError.from(ability).throwUnlessCan(action, subject);
	} catch (e) {
		if (e instanceof ForbiddenError) {
			throw new ForbiddenHttpError(action, subject);
		}
		throw e;
	}
}
