import type { PropsWithChildren, ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Ported (slimmed) from `munod/www/src/components/article.tsx` — kept only
 * the pieces the three admin detail pages (`categories/[id]`,
 * `products/[id]`, `product-images/[id]`) actually use. Dropped
 * `ArticleBadge`/`ArticleFooter`/the `isActive`/`isPublished` props on
 * `ArticleTitle` — munod's own product-publish-status chrome, no counterpart
 * in this template's flatter schema (design decision A4).
 */
export function Article({
	children,
	className,
}: PropsWithChildren & { className?: string }) {
	return (
		<article className={cn("w-full space-y-4", className)}>{children}</article>
	);
}

export function ArticleHeader({
	children,
	className,
}: PropsWithChildren & { className?: string }) {
	return <div className={cn("ml-2 space-y-2", className)}>{children}</div>;
}

export function ArticleTitle({ title }: { title: string }) {
	return <h2 className="text-4xl font-semibold">{title}</h2>;
}

export function ArticleContent({
	children,
	className,
}: PropsWithChildren & { className?: string }) {
	return <div className={cn("w-fit space-y-2", className)}>{children}</div>;
}

export function ArticleItem({
	title,
	description,
}: {
	title: string;
	description?: ReactNode;
}) {
	return (
		<div className="h-full content-center space-y-1 rounded-xl bg-muted px-4 py-2">
			<Label className="text-muted-foreground text-sm font-normal">
				{title}
			</Label>
			<p className="text-pretty text-base font-medium text-foreground">
				{description ?? "—"}
			</p>
		</div>
	);
}
