import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";

/**
 * The Node.js MSW server — used for server-side fetches (this is Next.js App
 * Router: `verifySession()` runs server-side, so its `fetch()` call needs the
 * Node interception layer, not the browser `msw/browser` worker). Started
 * from `src/instrumentation.ts`'s `register()` hook, gated by `API_MOCKING`.
 */
export const server = setupServer(...handlers);
