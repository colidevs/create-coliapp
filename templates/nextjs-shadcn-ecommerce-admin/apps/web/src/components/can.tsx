"use client";

import { createMongoAbility } from "@casl/ability";
import { AbilityProvider, Can } from "@casl/react";
import { type PropsWithChildren, useMemo } from "react";

import type { CatalogAbility, CatalogAbilityRule } from "@/lib/ability";

/**
 * RSC client-boundary rule (`.claude/rules/frontend-technical-conventions.md`
 * / `console-ui-kumo.md`): any third-party compound component used from a
 * Server Component needs its own `"use client"` leaf file — `@casl/react`'s
 * `<Can>` (isomorphic CASL) needs exactly this treatment.
 *
 * An `Ability` instance itself is not serializable across the Server/Client
 * boundary, so the RSC page passes down only the plain, JSON-serializable
 * `rules` array (`src/lib/ability.ts`'s `defineAbilityFor`), and this leaf
 * rebuilds the real `Ability` client-side before handing it to
 * `@casl/react`'s `AbilityProvider` context.
 *
 * `<Can>` here is a UI hint only — it hides/disables controls, never the
 * authorization boundary. The real check is always the Server Action's own
 * call into `apps/api`, re-validated server-side
 * (`.claude/rules/frontend-security-auth.md`).
 */
interface AppAbilityProviderProps extends PropsWithChildren {
	rules: CatalogAbilityRule[];
}

export function AppAbilityProvider({
	rules,
	children,
}: AppAbilityProviderProps) {
	const ability = useMemo(
		() => createMongoAbility<CatalogAbility>(rules),
		[rules],
	);

	return <AbilityProvider value={ability}>{children}</AbilityProvider>;
}

export { Can };
