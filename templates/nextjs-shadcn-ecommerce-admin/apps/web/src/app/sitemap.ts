import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * ADR 0032 (`.claude/rules/frontend-seo.md`). Infra-only baseline (Phase 5)
 * — the root/home entry only. Phase 6 (storefront port) extends this with
 * `products`/`products/[slug]` entries once those routes exist; well under
 * Google's 50,000-URL cap, so no `generateSitemaps()` split is needed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: siteConfig.url,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
		},
	];
}
