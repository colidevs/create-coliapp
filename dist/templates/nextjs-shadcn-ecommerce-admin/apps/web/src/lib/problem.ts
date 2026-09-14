import { type ActionFormState, problemToActionState } from "@colidevs/utils";

import type { Problem } from "@/generated/model";

/**
 * Adapter between this template's generated `Problem` type
 * (`@/generated/model/problem.ts`, `errors[]` items shaped
 * `{ field, message }` — `apps/api/src/v1/res/errors.ts`'s REAL,
 * already-shipped shape, per PR3b's own deviation note) and
 * `@colidevs/utils`'s `problemToActionState` (`console-golden-path.md`
 * decision), whose `ProblemFieldError` contract expects `{ field, detail }`.
 *
 * `@colidevs/utils@0.1.0` was confirmed published and installable
 * (`pnpm view @colidevs/utils --registry https://verdaccio.coli.com.ar`,
 * then a real `pnpm add` against this app) — added as a real dependency
 * rather than hand-writing a local equivalent, per task 7.3's instruction.
 * The one real gap found: its own doc comment states `{ field, detail }`
 * is "a fresh decision, not an existing convention" because "no live
 * colidevs API implements RFC 9457 yet" at the time it was authored — this
 * template's `apps/api` is the first one that does, and it independently
 * settled on `{ field, message }` (matching `zod`'s own `.issues[].message`
 * naming) before this mismatch was discovered. Adapting here, in one
 * shared place, is cheaper than either re-publishing `@colidevs/utils` or
 * reshaping every already-shipped `apps/api` error class.
 */
export function toActionState(problem: Problem): ActionFormState {
	// Destructure `errors` out of the spread — leaving it in `...rest` and
	// conditionally re-adding a same-named `errors` key produces a UNION
	// (`ProblemErrorsItem[] | ProblemFieldError[]`) rather than an override,
	// since TS can't statically resolve which branch of the conditional
	// spread wins. Excluding the original key entirely is what actually
	// replaces it.
	const { errors: rawErrors, ...rest } = problem;
	const errors = rawErrors?.map(({ field, message }) => ({
		field,
		detail: message,
	}));

	// Conditionally spread `errors` in (ADR 0030's `exactOptionalPropertyTypes`
	// floor) — an object literal explicitly assigning `errors: undefined`
	// is rejected even though the target field is optional; omitting the key
	// entirely when there is nothing to map is the correct, floor-compliant
	// shape.
	return problemToActionState({
		...rest,
		...(errors ? { errors } : {}),
	});
}
