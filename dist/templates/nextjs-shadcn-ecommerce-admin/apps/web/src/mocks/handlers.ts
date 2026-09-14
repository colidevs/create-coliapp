/**
 * Hand-written MSW handlers — deliberately empty in this batch (Phase 5,
 * infra only, zero page content). Unlike `templates/nextjs-kumo-console`'s
 * own `src/mocks/handlers.ts` (which hand-mocks `/api/v1/session` for its
 * real login page), this template has no page yet that depends on a
 * hand-authored fixture. `src/mocks/node.ts` composes this array with the
 * Orval-generated Faker-based mocks (`orval.config.ts`) — the default MSW
 * backend for every catalog/order endpoint until a later phase needs a
 * hand-written, realistic fixture for a specific one.
 */
export const handlers = [];
