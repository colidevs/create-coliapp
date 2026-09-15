/**
 * @description Shared Postgres constraint-error detection, extracted from
 * four repository files that each carried a byte-identical copy
 * (`admin/products`, `admin/variant-option-types`, `admin/variant-option-values`,
 * `admin/variants`) — see `sdd/ecommerce-product-variants` PR13.
 *
 * Reads the real Postgres error code off a thrown error.
 * `drizzle-orm@0.45.2` wraps every raw `pg` driver error inside its own
 * `DrizzleQueryError`, nesting the original error — the one that actually
 * carries `.code` (e.g. `23505`/`23514`) — under `.cause`, never on the
 * thrown error itself (`drizzle-orm/errors.js`, verified against the
 * installed version). Falls back to `.code` directly in case some other
 * code path throws a raw, unwrapped `pg` error.
 */
export function getPgErrorCode(e: unknown): string | undefined {
	if (typeof e !== "object" || e === null) {
		return undefined;
	}
	const cause = (e as { cause?: unknown }).cause;
	if (
		typeof cause === "object" &&
		cause !== null &&
		"code" in cause &&
		typeof (cause as { code?: unknown }).code === "string"
	) {
		return (cause as { code: string }).code;
	}
	if ("code" in e && typeof (e as { code?: unknown }).code === "string") {
		return (e as { code: string }).code;
	}
	return undefined;
}

/**
 * @description Postgres `23505` (`unique_violation`) — e.g. a duplicate
 * `slug`/`name` on a create/update path.
 */
export function isUniqueViolation(e: unknown): boolean {
	return getPgErrorCode(e) === "23505";
}

/**
 * @description Postgres `23514` (`check_violation`) — e.g. a
 * `variant-options` domain deferrable constraint trigger
 * (`drizzle/0005_variant_rls_and_invariants.sql`) firing at COMMIT. Same
 * `.code` detection shape as `isUniqueViolation` above.
 */
export function isCheckViolation(e: unknown): boolean {
	return getPgErrorCode(e) === "23514";
}
