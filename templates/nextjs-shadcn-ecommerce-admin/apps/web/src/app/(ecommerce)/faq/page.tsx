import type { Metadata } from "next";

/**
 * Standard content-page scaffold, added live-audit fix
 * (`sdd/ecommerce-product-variants/apply-progress` PR16) — see
 * `../terms/page.tsx`'s doc comment for the full context.
 *
 * No Accordion component exists in this template's `components/ui/`
 * (confirmed: `fd accordion components/ui` — zero hits) — a plain,
 * semantic `<dl>` question/answer list is used instead, per the task's own
 * "if not, a simple list is fine" guidance. Adding an Accordion primitive
 * purely for this one page is out of scope here.
 */
export const metadata: Metadata = {
	title: "Frequently Asked Questions",
};

const FAQS: { question: string; answer: string }[] = [
	{
		question: "[Placeholder] What payment methods do you accept?",
		answer:
			"[Placeholder] Replace with the real list of payment methods this store accepts via dLocal.",
	},
	{
		question: "[Placeholder] How long does shipping take?",
		answer:
			"[Placeholder] Replace with the store's real shipping timeframes and carriers.",
	},
	{
		question: "[Placeholder] What is your return policy?",
		answer:
			"[Placeholder] Replace with a short summary and a link to the full Returns section of the Terms & Conditions page.",
	},
	{
		question: "[Placeholder] How can I contact support?",
		answer:
			"[Placeholder] Replace with the store's real support email or contact form.",
	},
];

export default function FaqPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-16">
			<h1 className="font-semibold text-3xl">Frequently Asked Questions</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				Placeholder questions and answers below — replace each one with the
				business's own real content before launch.
			</p>

			<dl className="mt-8 flex flex-col gap-6">
				{FAQS.map((faq) => (
					<div key={faq.question} className="border-b pb-6 last:border-b-0">
						<dt className="font-semibold text-lg">{faq.question}</dt>
						<dd className="mt-2 text-muted-foreground">{faq.answer}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
