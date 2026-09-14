/**
 * Next.js Instrumentation Hook — `register()` runs once when a new server
 * worker process starts. Mirrors `templates/nextjs-kumo-console/src/
 * instrumentation.ts`'s design decision D2: MSW is the default dev/test
 * backend, gated by an explicit opt-in flag (`API_MOCKING`), never an
 * implicit `NODE_ENV` check.
 */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME !== "nodejs") {
		return;
	}

	if (process.env.API_MOCKING !== "enabled") {
		return;
	}

	const { server } = await import("@/mocks/node");
	server.listen({ onUnhandledRequest: "bypass" });
}
