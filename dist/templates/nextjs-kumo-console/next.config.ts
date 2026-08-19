import type { NextConfig } from "next";

/**
 * Static CSP + `Permissions-Policy`, wired via `headers()`
 * (frontend-performance-tooling.md's default — nonce-based CSP stays an
 * opt-in escalation for a specific route, never adopted broadly here).
 *
 * `style-src 'self' 'unsafe-inline'` (design decision D6): Next injects
 * inline `<style>` tags itself (e.g. font optimization, some client
 * component styling) — a strict `style-src 'self'` would break those, and a
 * nonce-based CSP is explicitly out of scope as the default (ADR 0023 keeps
 * it an opt-in escalation, incompatible with Partial Prerendering / Cache
 * Components).
 *
 * `script-src 'self' 'unsafe-inline'` — empirically confirmed necessary
 * (not merely by analogy with `style-src`): a strict `script-src 'self'`
 * (no `'unsafe-inline'`, no nonce) breaks App Router hydration outright.
 * Next's RSC streaming architecture injects its own inline bootstrap
 * `<script>` tags (`self.__next_f.push(...)` payload chunks); without
 * `'unsafe-inline'` the browser blocks every one of them and React never
 * hydrates (`Invariant: Expected a request ID to be defined for the
 * document via self.__next_r` is the exact failure observed). The only
 * stricter alternative is the nonce-based escalation this rule already
 * keeps opt-in (ADR 0023) — never a bare `script-src 'self'` as the static
 * default, which is silently broken, not merely "less strict".
 *
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY` are set together,
 * deliberately redundant — same "both, deliberately" posture the API side
 * takes (`api-communication-standard.md`'s security-headers row): CSP's
 * `frame-ancestors` is the modern mechanism, `X-Frame-Options` covers any
 * consumer that doesn't honor CSP framing directives at all.
 */
const cspDirectives = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https://images.colidevs.com",
	"font-src 'self'",
	"connect-src 'self'",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
	images: {
		unoptimized: true,
		remotePatterns: [{ protocol: "https", hostname: "images.colidevs.com" }],
	},
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "Content-Security-Policy", value: cspDirectives },
					{ key: "X-Frame-Options", value: "DENY" },
					{
						key: "Permissions-Policy",
						value:
							"camera=(), microphone=(), geolocation=(), interest-cohort=()",
					},
				],
			},
		];
	},
	experimental: {
		serverActions: {
			// Sensible localhost default for a scaffold template. A real
			// deployment MUST set its own actual origin(s) here — nested under
			// `experimental.serverActions`, not top-level (still `experimental`
			// as of Next.js 16.3.1 even though Server Actions themselves are
			// stable; setting this at the top level silently has no effect).
			// Required for any deployment behind nginx-proxy-manager
			// (frontend-security-auth.md) — confirm `X-Forwarded-Host` is
			// forwarded correctly before relying on this in production.
			allowedOrigins: ["localhost:3000"],
		},
	},
};

export default nextConfig;
