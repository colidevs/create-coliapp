/**
 * @description Public surface of the plain-Postgres/Drizzle data-access
 * path (ADR 0014 / design D4). The raw Drizzle instance from `./client.ts`
 * is deliberately NOT re-exported here — only the RLS-session-scoped
 * entrypoints and the schema are. See `./session.ts` for the enforcement
 * rationale.
 */

export { schema } from "./client";
export type { TenantCtx, Tx } from "./session";
export { withPlatformSession, withTenantSession } from "./session";
