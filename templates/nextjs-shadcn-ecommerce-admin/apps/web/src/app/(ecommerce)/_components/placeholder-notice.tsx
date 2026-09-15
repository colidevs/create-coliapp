import type { ReactNode } from "react";

/**
 * Shared visible placeholder banner for the standard content-page scaffold
 * (`sdd/ecommerce-product-variants/apply-progress` PR16 — "Content pages:
 * Terms, Privacy, FAQ, About"). Colocated under `(ecommerce)/_components`
 * (ADR 0019, `.claude/rules/frontend-component-composition.md`) because it is
 * shared across multiple sibling routes within this one route group
 * (`terms`, `privacy`) — not a cross-route-group shared component that would
 * belong in the top-level `components/` folder.
 *
 * Deliberately a loud, always-visible `role="note"` banner rather than a
 * source-code-only comment: a client filling in real legal text is far more
 * likely to notice and replace a banner rendered on the live page than a
 * TODO comment buried in JSX that only a developer would ever see.
 */
export function PlaceholderNotice({ children }: { children: ReactNode }) {
	return (
		<div
			role="note"
			className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
		>
			<p className="font-semibold">
				Placeholder content — replace before launch
			</p>
			<p className="mt-1">{children}</p>
		</div>
	);
}
