import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import "./globals.css";

export const metadata: Metadata = {
	title: "{{name}}",
	description: "colidevs console, built on the Kumo UI reference template.",
};

interface Props extends PropsWithChildren {}

// Static "light" data-mode for this Phase 1 skeleton — theme-switching logic
// is out of scope here (see hefesto's console-ui-kumo.md: Kumo reads
// `data-mode` on `<html>`, never the Tailwind `dark:` variant).
export default function RootLayout({ children }: Readonly<Props>) {
	return (
		<html lang="en" data-mode="light">
			<body className="bg-kumo-base text-kumo-default antialiased min-h-[100dvh]">
				{children}
			</body>
		</html>
	);
}
