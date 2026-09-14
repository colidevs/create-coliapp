import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { storefrontHandlers } from "@/mocks/handlers/storefront";

/**
 * The Node.js MSW server — server-side fetches (`src/lib/api.ts`,
 * `src/lib/get-server-session.ts`) need the Node interception layer, not the
 * browser `msw/browser` worker. Started from `src/instrumentation.ts`'s
 * `register()` hook, gated by `API_MOCKING`.
 *
 * Mirrors `templates/nextjs-kumo-console/src/mocks/node.ts`'s own,
 * deliberate posture (its `orval.config.ts` doc comment states this
 * explicitly): the Orval-generated, Faker-based MSW mocks
 * (`src/generated/endpoints/default/default.msw.ts`) are committed as
 * Orval's own codegen artifact ("generate for real, commit it") but are NOT
 * wired here. Two reasons, not one:
 *
 * 1. Same as kumo-console — a realistic, tenant/domain-aware fixture set
 *    belongs hand-written per module, alongside the page that actually
 *    consumes it (kumo-console's own `src/mocks/handlers/orders.ts`
 *    arrived with its `orders` page, not before). This batch (Phase 5) is
 *    infra only, zero page content — there is no consumer yet to write a
 *    realistic fixture for.
 * 2. A real, found gap: the generated `default.msw.ts` does not compile
 *    under this project's ADR 0030 `exactOptionalPropertyTypes` floor —
 *    Faker's random-`undefined` generation for an `.optional()` (not
 *    `.nullable()`) field like `admin/orders`'s `OrderBuyerInfo.phone`
 *    always assigns the object key (`phone: string | undefined`), which
 *    `exactOptionalPropertyTypes` rejects against the generated `phone?:
 *    string` model type. Never hand-edit a file under `src/generated/**`
 *    (ADR 0040) — this file is simply not imported anywhere in this
 *    project's own TypeScript program (see `tsconfig.json`'s matching
 *    `exclude` entry) until a future phase either hand-writes real fixtures
 *    per module (closing reason 1) or Orval's own mock generator stops
 *    producing this shape (closing reason 2).
 *
 * Phase 6 is the first phase to close reason 1 for the storefront's own
 * endpoints — `storefrontHandlers` (`src/mocks/handlers/storefront.ts`) is
 * exactly that hand-written, per-module fixture set, composed here
 * alongside the (still empty) base `handlers`.
 */
export const server = setupServer(...handlers, ...storefrontHandlers);
