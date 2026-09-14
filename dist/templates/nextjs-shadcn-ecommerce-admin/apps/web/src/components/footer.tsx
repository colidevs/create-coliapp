import { siteConfig } from "@/config/site";

/**
 * Simplified storefront footer — adapted, not a literal port of munod's
 * `components/footer.tsx` (`HomeFooter`), which renders the furniture-shop
 * "drag to explore"/zoom-controls chrome this template does not port (see
 * `shell.tsx`'s doc comment).
 */
export function Footer() {
	return (
		<footer className="border-t">
			<div className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground text-sm">
				© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
			</div>
		</footer>
	);
}
