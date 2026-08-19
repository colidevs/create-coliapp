"use client";

import { createMongoAbility } from "@casl/ability";
import { AbilityProvider, Can } from "@casl/react";
import { type PropsWithChildren, useMemo } from "react";

import type { AppAbility, AppAbilityRule } from "@/lib/ability";

/**
 * RSC client-boundary rule (frontend-technical-conventions.md /
 * console-ui-kumo.md): any third-party component used from a Server
 * Component needs its own "use client" leaf file — `@casl/react`'s `<Can>`
 * (isomorphic CASL, api-rbac-signing-auth.md) needs exactly this treatment.
 *
 * An `Ability` instance itself is not serializable across the Server/Client
 * boundary, so the RSC page (`defineAbilityFor`, `src/lib/ability.ts`) passes
 * down only the plain, JSON-serializable `rules` array, and this leaf rebuilds
 * the real `Ability` client-side before handing it to `@casl/react`'s
 * `AbilityProvider` context (its `value` prop, per
 * `@casl/react`'s own `hooks/useAbility.d.ts`).
 *
 * `<Can>` here is a UI hint only — it hides/disables controls, never the
 * authorization boundary. The real check is always `verifySession()` +
 * the Server Action's own membership check
 * (`src/lib/actions/select-tenant.ts`), re-validated server-side
 * (frontend-security-auth.md).
 */
interface AppAbilityProviderProps extends PropsWithChildren {
	rules: AppAbilityRule[];
}

export function AppAbilityProvider({
	rules,
	children,
}: AppAbilityProviderProps) {
	const ability = useMemo(() => createMongoAbility<AppAbility>(rules), [rules]);

	return <AbilityProvider value={ability}>{children}</AbilityProvider>;
}

export { Can };
