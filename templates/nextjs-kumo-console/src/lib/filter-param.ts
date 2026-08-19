import {
	type Aip160Filter,
	parseAip160Filter,
	serializeAip160Filter,
} from "@colidevs/utils";
import { createParser } from "nuqs/server";

/**
 * Local `nuqs` × AIP-160 wrapper (frontend-technical-conventions.md,
 * design decision D4). `@colidevs/utils`'s `parseAip160Filter`/
 * `serializeAip160Filter` are pure functions with zero `nuqs` dependency —
 * this is the thin, app-local `createParser` adapter the rule describes,
 * not a re-implementation of the bridge itself.
 *
 * Deliberately v1-scoped to a flat, `AND`-only clause conjunction (no `OR`/
 * `NOT`/parenthesized grouping) — inherited from `parseAip160Filter` itself,
 * not a limitation added here.
 *
 * **Server-side import only.** `@colidevs/utils`'s one accepted cost (D4) is
 * scoped specifically to server-side usage — its barrel export pulls in
 * `xlsx`, which must never reach the client bundle. Import this module only
 * from `createSearchParamsCache({ filter: aip160FilterParser })`
 * (`orders/page.tsx`, a Server Component). Any client-side filter control
 * (a `"use client"` leaf) binds the same `"filter"` key with `nuqs`'s own
 * `parseAsString` instead — it writes/reads the raw AIP-160 wire string
 * without needing the typed `Aip160Filter` parser client-side at all; the
 * server-rendered page is what actually deserializes it.
 *
 * Imports `createParser` from `nuqs/server`, not the root `nuqs` entrypoint
 * — the root package is a `"use client"` module (its `createParser` is meant
 * for client-side parser configs), and Next's RSC boundary rejects calling
 * a client-marked export from server code at build time. `nuqs/server`
 * re-exports the identical function without that marker.
 */
export const aip160FilterParser = createParser<Aip160Filter>({
	parse: parseAip160Filter,
	serialize: serializeAip160Filter,
	eq: (a, b) => serializeAip160Filter(a) === serializeAip160Filter(b),
}).withDefault([]);
