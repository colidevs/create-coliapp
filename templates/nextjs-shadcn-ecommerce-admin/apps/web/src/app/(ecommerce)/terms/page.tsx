import type { Metadata } from "next";

import { PlaceholderNotice } from "../_components/placeholder-notice";

/**
 * Standard content-page scaffold, added live-audit fix
 * (`sdd/ecommerce-product-variants/apply-progress` PR16): this template
 * shipped zero standard content pages — no Terms/Privacy/FAQ/About route
 * existed anywhere under `(ecommerce)` before this PR (confirmed via a
 * repo-wide search for `terms`/`privacy`/`faq`/`about` routes, zero hits).
 * dLocal (`.claude/rules` — this template's payment provider) requires a
 * merchant-facing Terms & Conditions page for compliance; the PAGE existing
 * is the compliance requirement this PR closes. The actual legal TEXT below
 * is a structural placeholder only — see `PlaceholderNotice` — each client
 * deploying this template is responsible for its own reviewed legal copy,
 * per the `customize-store` skill's setup flow.
 *
 * Metadata pattern matches this template's existing convention (a static
 * `export const metadata` object, e.g. `checkout/return/page.tsx`) — the
 * root layout's title template (`app/layout.tsx`) resolves this to
 * "Terms & Conditions | {{name}}".
 */
export const metadata: Metadata = {
	title: "Terms & Conditions",
};

const SECTIONS: { heading: string; body: string }[] = [
	{
		heading: "Acceptance of Terms",
		body: "[Placeholder] By accessing or using this site, you agree to be bound by these Terms & Conditions. Replace this paragraph with your own reviewed legal language before launch.",
	},
	{
		heading: "Use of the Site",
		body: "[Placeholder] Describe here the acceptable and prohibited uses of the storefront, account requirements, and any age or eligibility restrictions.",
	},
	{
		heading: "Products and Pricing",
		body: "[Placeholder] Describe how product availability, pricing, and currency are presented, and note that prices are subject to change without notice.",
	},
	{
		heading: "Payment Processing",
		body: "[Placeholder] Payments on this site are processed by dLocal. Describe accepted payment methods, when a charge is captured, and how payment disputes are handled.",
	},
	{
		heading: "Returns and Refunds",
		body: "[Placeholder] Describe your return window, refund eligibility, and the process a customer must follow to request one.",
	},
	{
		heading: "Limitation of Liability",
		body: "[Placeholder] Describe the extent to which the business limits its liability for damages arising from use of the site or its products.",
	},
	{
		heading: "Governing Law",
		body: "[Placeholder] State which jurisdiction's laws govern these terms and where disputes will be resolved.",
	},
	{
		heading: "Contact",
		body: "[Placeholder] Provide a real support email or physical address customers can use to reach the business about these terms.",
	},
];

export default function TermsPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-16">
			<h1 className="font-semibold text-3xl">Terms & Conditions</h1>

			<PlaceholderNotice>
				This page is a structural scaffold only, ready to be reviewed and
				replaced with the business's own legal text. A published Terms &
				Conditions page is required by dLocal (this template's payment provider)
				for merchant compliance — the real wording below is not.
			</PlaceholderNotice>

			<div className="flex flex-col gap-8">
				{SECTIONS.map((section) => (
					<section key={section.heading}>
						<h2 className="font-semibold text-xl">{section.heading}</h2>
						<p className="mt-2 text-muted-foreground">{section.body}</p>
					</section>
				))}
			</div>
		</div>
	);
}
