/**
 * Next.js's Instrumentation Hook (`src/instrumentation.ts` — same root-vs-`src/`
 * dual location Next supports for `proxy.ts`/`middleware.ts`, confirmed against
 * the installed `next@16.3.1`'s own `INSTRUMENTATION_HOOK_FILENAME` constant).
 * `register()` runs once when a new server worker process starts — the
 * documented place to start `msw/node` (design decision D2: MSW is the
 * default dev/test backend, including auth/session data).
 */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME !== "nodejs") {
		return;
	}

	// Explicit opt-in flag, not an implicit NODE_ENV check — mirrors MSW's own
	// documented Next.js integration pattern. Flip API_MOCKING off (and point
	// API_BASE_URL at a real backend) once one exists; see .env.example.
	if (process.env.API_MOCKING !== "enabled") {
		return;
	}

	const { server } = await import("@/mocks/node");
	server.listen({ onUnhandledRequest: "bypass" });
}
