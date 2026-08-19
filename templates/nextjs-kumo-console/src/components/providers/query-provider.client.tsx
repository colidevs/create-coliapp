"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { getQueryClient } from "@/lib/query-client";

/**
 * TanStack Query's own documented Next.js App Router pattern: a client
 * boundary that calls `getQueryClient()` (`src/lib/query-client.ts`) so the
 * browser reuses one long-lived `QueryClient` across client-side
 * navigations, while every Server Component render still gets its own
 * fresh instance for prefetching (frontend-technical-conventions.md).
 * `<HydrationBoundary>` (used per-page, e.g. `orders/page.tsx`) only needs
 * to be a descendant of this provider — it does not need its own provider.
 */
export function QueryProvider({ children }: PropsWithChildren) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
