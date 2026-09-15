import Link from "next/link";

import { siteConfig } from "@/config/site";

/**
 * Simplified storefront footer — adapted, not a literal port of munod's
 * `components/footer.tsx` (`HomeFooter`), which renders the furniture-shop
 * "drag to explore"/zoom-controls chrome this template does not port (see
 * `shell.tsx`'s doc comment).
 *
 * Content-page links added (`sdd/ecommerce-product-variants/apply-progress`
 * PR16): the footer is the standing convention for reaching standard
 * low-traffic content pages (Terms, Privacy, FAQ, About) without cluttering
 * `header.tsx`'s primary category nav — matches every real storefront's own
 * layout convention, and closes the "orphan route" gap this PR's own
 * instructions call out (a page with no link to it is unreachable, not just
 * unlinked).
 */
const CONTENT_LINKS: { href: string; label: string }[] = [
	{ href: "/about", label: "About Us" },
	{ href: "/faq", label: "FAQ" },
	{ href: "/terms", label: "Terms & Conditions" },
	{ href: "/privacy", label: "Privacy Policy" },
];

export function Footer() {
	return (
		<footer className="border-t">
			<div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-muted-foreground text-sm">
				<nav className="flex flex-wrap gap-x-6 gap-y-2">
					{CONTENT_LINKS.map((link) => (
						<Link key={link.href} href={link.href} className="hover:underline">
							{link.label}
						</Link>
					))}
				</nav>
				<p>
					© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
