import type { PropsWithChildren } from "react";

import { QueryProvider } from "@/components/providers/query-provider.client";

/**
 * Layout scoped to the `(console)` route group (URL-invisible) — keeps the
 * TanStack Query provider (needed by `orders/page.tsx` and its client leaves)
 * out of the root layout / Phase 1's public home page, which has no need
 * for it.
 */
export default function ConsoleLayout({ children }: PropsWithChildren) {
	return <QueryProvider>{children}</QueryProvider>;
}
