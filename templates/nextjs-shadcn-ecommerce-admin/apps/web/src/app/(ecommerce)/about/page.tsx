import type { Metadata } from "next";

/**
 * Standard content-page scaffold, added live-audit fix
 * (`sdd/ecommerce-product-variants/apply-progress` PR16) — see
 * `../terms/page.tsx`'s doc comment for the full context.
 */
export const metadata: Metadata = {
	title: "About Us",
};

export default function AboutPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-16">
			<h1 className="font-semibold text-3xl">About Us</h1>
			<div className="mt-6 flex flex-col gap-4 text-muted-foreground">
				<p>
					[Placeholder] This is where the business tells its own story — replace
					this paragraph with a short introduction: who you are, what you sell,
					and why customers should trust you.
				</p>
				<p>
					[Placeholder] Add a second paragraph covering your mission, values, or
					history — whatever helps a first-time visitor understand who they're
					buying from.
				</p>
				<p>
					[Placeholder] Optionally close with contact details or a link to the
					FAQ page for anything not covered here.
				</p>
			</div>
		</div>
	);
}
