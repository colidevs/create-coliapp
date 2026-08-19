import type { ActionFormState } from "@colidevs/utils";

/**
 * `OrderActionState`/`initialOrderActionState` extracted out of
 * `actions.ts` (Phase 4 fix — a genuine Phase 3 bug this phase's real
 * `next dev` + Playwright run surfaced, not present before because Phase 3
 * only ever exercised this module through Vitest and a production build,
 * neither of which hit this specific dev-mode check): a `"use server"`
 * module may only export async functions at its top level — Next's own RSC
 * compiler rejects any other top-level value export (`Error: A "use
 * server" file can only export async functions, found object`, confirmed
 * against the exact failure `pnpm exec playwright test` produced once a
 * real dialog submission executed). `initialOrderActionState` (a plain
 * object) and the `OrderActionState` type broke that rule while living in
 * `actions.ts` directly.
 *
 * This file carries zero behavior change — `actions.ts` re-imports both
 * names and the two client dialog leaves
 * (`src/components/orders/*.client.tsx`) now import them from here instead
 * of from `actions.ts`. `ActionFormState` is imported `type`-only
 * (design decision D4 / task 3.7's own constraint): `@colidevs/utils`'s
 * runtime code (its `xlsx` transitive dependency) must never reach the
 * client bundle, and a type-only import is erased at compile time — this
 * module is safely importable from a `"use client"` leaf precisely because
 * it never references `@colidevs/utils` at runtime, only its type.
 */
export interface OrderActionState extends ActionFormState {
	/** Set only on success — absent otherwise, so a client leaf can branch on `state.success` without inspecting `message`/`errors`. */
	success?: boolean;
}

export const initialOrderActionState: OrderActionState = {};
