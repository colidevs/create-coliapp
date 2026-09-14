import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import "@/styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { poppins } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * Minimal infra-only root layout (Phase 5, `sdd/ecommerce-admin-template/
 * tasks`) — fonts, theme, and toast wiring only. The `(ecommerce)` and
 * `(adm)` route-group layouts (Phase 6/7) own their own chrome
 * (header/footer, admin sidebar) and metadata overrides on top of this —
 * this file is deliberately NOT nextjs15-biome-shadcn's own root layout
 * (which renders `SiteHeader`/`SiteFooter`/`Container`, a general-web-page
 * shell this template's two route groups replace, not compose with).
 *
 * ADR 0032 (`.claude/rules/frontend-seo.md`): full, positive SEO metadata
 * here is correct for the general-web/storefront track — the console
 * track's one mandatory obligation (`noindex`) is scoped to the `(adm)`
 * route group only (`app/robots.ts`'s `/admin` disallow rule, plus that
 * group's own `metadata.robots.index: false` once Phase 7 adds it) and does
 * not apply at the root.
 */
export const metadata: Metadata = {
	title: {
		default: siteConfig.name,
		template: `%s | ${siteConfig.name}`,
	},
	metadataBase: new URL(siteConfig.url),
	applicationName: siteConfig.name,
	category: "website",
	description: siteConfig.description,
	alternates: {
		canonical: siteConfig.url,
	},
	authors: [
		{
			name: "colidevs team",
		},
	],
	creator: "colidevs",
	publisher: "colidevs",
	openGraph: {
		type: "website",
		url: siteConfig.url,
		title: siteConfig.name,
		description: siteConfig.description,
		siteName: siteConfig.name,
		images: [],
	},
	twitter: {
		creator: "@colidevs",
	},
};

export default function RootLayout({ children }: Readonly<PropsWithChildren>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"font-normal antialiased min-h-[100dvh]",
					poppins.className,
				)}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
					enableColorScheme
				>
					{children}
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
