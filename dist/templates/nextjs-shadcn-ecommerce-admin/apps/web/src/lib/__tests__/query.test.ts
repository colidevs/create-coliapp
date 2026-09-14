import { describe, expect, it } from "vitest";

import { getQueryClient } from "@/lib/query";

describe("getQueryClient", () => {
	it("returns a QueryClient with the expected default staleTime", () => {
		const client = getQueryClient();

		expect(client.getDefaultOptions().queries?.staleTime).toBe(60 * 1000);
	});

	it("returns a fresh instance per call under Vitest's node environment (design decision A6)", () => {
		// Vitest's node environment has no `window`, so
		// `environmentManager.isServer()` is true — exactly the per-request,
		// never-shared-singleton branch this rule requires
		// (`.claude/rules/frontend-technical-conventions.md`). This is the
		// deliberate opposite of munod's own `src/lib/query.ts`
		// (`const client = new QueryClient(); export { client as queryClient
		// };`), a live ADR 0021 violation this module does not repeat.
		const first = getQueryClient();
		const second = getQueryClient();

		expect(first).not.toBe(second);
	});
});
