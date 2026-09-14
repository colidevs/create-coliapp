import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * ADR 0032 (`.claude/rules/frontend-seo.md`) — general-web/storefront track
 * gets a normal, permissive `robots.ts`; the console track's one mandatory
 * obligation is the `/admin` disallow below, set up now (Phase 5, infra
 * only) so Phase 7 (the `(adm)` route group's own pages) only needs to add
 * the matching per-page `metadata.robots.index: false` — no `robots.ts`
 * change needed at that point.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/admin", "/api"],
		},
		sitemap: `${siteConfig.url}/sitemap.xml`,
	};
}
