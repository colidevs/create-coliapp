import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { ordersHandlers } from "@/mocks/handlers/orders";

/**
 * The Node.js MSW server — used for server-side fetches (this is Next.js App
 * Router: `verifySession()` runs server-side, so its `fetch()` call needs the
 * Node interception layer, not the browser `msw/browser` worker). Started
 * from `src/instrumentation.ts`'s `register()` hook, gated by `API_MOCKING`.
 *
 * Composes Phase 2's session handlers with Phase 3's `orders` handlers —
 * kept in separate files (Phase 2's `handlers.ts` explicitly says not to
 * extend it for the `orders` module) and combined only here.
 */
export const server = setupServer(...handlers, ...ordersHandlers);
