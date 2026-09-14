import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { listPublicProducts } from "@/generated/endpoints";

/**
 * ADR 0032 (`.claude/rules/frontend-seo.md`). Phase 5 shipped the root/home
 * entry only; Phase 6 (storefront port, this batch) extends it with the
 * `/products` listing plus one entry per active product — well under
 * Google's 50,000-URL cap for any template-scale catalog, so no
 * `generateSitemaps()` split is needed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Guarded: `apps/api` (or MSW) may not be reachable at `next build` time —
	// a sitemap missing its product entries degrades gracefully rather than
	// failing the whole build.
	const products = await listPublicProducts({ size: 100 })
		.then((result) => (result.status === 200 ? result.data.items : []))
		.catch(() => []);

	return [
		{
			url: siteConfig.url,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
		},
		{
			url: `${siteConfig.url}/products`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.8,
		},
		...products.map((product) => ({
			url: `${siteConfig.url}/products/${product.slug}`,
			lastModified: product.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.6,
		})),
	];
}
