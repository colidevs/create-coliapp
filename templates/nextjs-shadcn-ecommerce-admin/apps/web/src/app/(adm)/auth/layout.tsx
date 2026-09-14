/** Ported verbatim from `munod/www/src/app/(adm)/auth/layout.tsx`. */
export default function AuthRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			{children}
		</div>
	);
}
