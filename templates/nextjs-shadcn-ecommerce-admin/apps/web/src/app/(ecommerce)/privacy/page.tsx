import type { Metadata } from "next";

import { PlaceholderNotice } from "../_components/placeholder-notice";

/**
 * Standard content-page scaffold, added live-audit fix
 * (`sdd/ecommerce-product-variants/apply-progress` PR16) — see
 * `../terms/page.tsx`'s doc comment for the full context (this template
 * shipped zero standard content pages before this PR; dLocal requires the
 * page to exist, not this specific placeholder text).
 */
export const metadata: Metadata = {
	title: "Privacy Policy",
};

const SECTIONS: { heading: string; body: string }[] = [
	{
		heading: "Data Collection",
		body: "[Placeholder] Describe what personal data is collected — account details, checkout information (name, email, document, shipping address), and any analytics/cookie data.",
	},
	{
		heading: "Data Use",
		body: "[Placeholder] Describe how collected data is used — order fulfillment, payment processing via dLocal, customer support, and any marketing communications, noting opt-in/opt-out where applicable.",
	},
	{
		heading: "Data Sharing",
		body: "[Placeholder] Describe which third parties (e.g. the payment processor, shipping carriers) receive customer data, and under what circumstances data may be disclosed.",
	},
	{
		heading: "Cookies",
		body: "[Placeholder] Describe which cookies or local storage this site uses (e.g. cart state, theme preference) and how a visitor can manage or clear them.",
	},
	{
		heading: "Your Rights",
		body: "[Placeholder] Describe how a customer can request access to, correction of, or deletion of their personal data, per applicable data-protection law.",
	},
	{
		heading: "Contact",
		body: "[Placeholder] Provide a real support email or physical address customers can use to reach the business about privacy questions.",
	},
];

export default function PrivacyPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-16">
			<h1 className="font-semibold text-3xl">Privacy Policy</h1>

			<PlaceholderNotice>
				This page is a structural scaffold only, ready to be reviewed and
				replaced with the business's own reviewed privacy text before launch.
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
