import type { Metadata } from "next";

import "@/styles/globals.css";
import { Container } from "@/components/container";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { siteConfig } from "@/config/site";
import { poppins } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

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
		languages: {
			"es-AR": siteConfig.url,
		},
	},
	keywords: ["colidevs"],
	authors: [
		{
			name: "colidevs team",
		},
	],
	creator: "colidevs",
	publisher: "colidevs",
	openGraph: {
		type: "website",
		locale: "es_AR",
		url: siteConfig.url,
		title: siteConfig.name,
		description: siteConfig.description,
		siteName: siteConfig.name,
		images: [],
	},
	twitter: {
		creator: "@colidevs",
	},
	icons: {},
};

interface Props extends PropsWithChildren {}

export default function RootLayout({ children }: Readonly<Props>) {
	return (
		<html lang="es" suppressHydrationWarning>
			<body
				className={cn(
					"font-normal antialiased min-h-[100dvh]",
					Poppins.className,
				)}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
					enableColorScheme
				>
					<div vaul-drawer-wrapper="">
						<div className="relative flex min-h-[100dvh] flex-col">
							<div className="mesh absolute -z-10 invert dark:invert-0 bottom-0 w-full h-full" />
							<Container>
								<SiteHeader useBorder />
								{children}
								<SiteFooter useBorder />
							</Container>
						</div>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
