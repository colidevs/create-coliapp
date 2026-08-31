import type { MetadataRoute } from "next";

/**
 * This scaffold is a console reference template — there is no public
 * marketing surface to keep indexable, so the disallow is site-wide.
 * A project that adds real public pages on top of this skeleton should
 * narrow this rule accordingly. Pairs with the `(console)` route group's
 * `metadata: { robots: { index: false } }` (ADR 0032 §7,
 * `.claude/rules/frontend-seo.md`) — neither substitutes the other.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			disallow: "/",
		},
	};
}
