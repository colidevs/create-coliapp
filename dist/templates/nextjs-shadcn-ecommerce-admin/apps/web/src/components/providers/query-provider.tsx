"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { getQueryClient } from "@/lib/query";

/**
 * TanStack Query's own documented Next.js App Router pattern — ported
 * (structurally) from `nextjs-kumo-console/src/components/providers/
 * query-provider.client.tsx`. `<HydrationBoundary>` (used per-page, e.g.
 * `(ecommerce)/page.tsx`/`products/page.tsx`) only hydrates the query
 * CACHE DATA; it does not itself supply the `QueryClientContext` a
 * descendant `useQuery` call needs — that's this provider's job. A real,
 * found gap: Phase 5 built `getQueryClient()` but wired no provider at all
 * (no page consumed `useQuery` yet); the first page that did
 * (`ProductsListClient`) failed at runtime with "No QueryClient set" until
 * this was added.
 */
export function QueryProvider({ children }: PropsWithChildren) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
