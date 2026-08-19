import Image from "next/image";

import { buildSignedThumborUrl } from "@/lib/thumbor";

/**
 * One small, real usage of the Thumbor signing pattern (`src/lib/thumbor.ts`
 * → `@colidevs/thumbor-client`) — a placeholder console logo/avatar, signed
 * server-side. Server Component: `Image` is a flat Next.js export (no
 * `"use client"` leaf needed), and signing must only ever happen
 * server-side (`src/lib/thumbor.ts`'s own doc comment).
 *
 * `unoptimized` (frontend-performance-tooling.md's decided default for every
 * Thumbor-sourced `<Image>`): Thumbor already did the size/crop/format work,
 * so Next's own Image Optimization API re-processing it again is redundant.
 *
 * Points at a placeholder object path (`branding/app-logo.png`) that doesn't
 * need to exist in a real Thumbor bucket for this template to demonstrate
 * the correct pattern — the point is the signing code path, not a live
 * asset. A real deployment swaps this path for its own bucket object.
 */
export function AppLogo() {
	const src = buildSignedThumborUrl("branding/app-logo.png", {
		size: { width: 40, height: 40 },
		crop: { mode: "smart" },
		quality: 80,
	});

	return (
		<Image
			src={src}
			alt="{{name}} logo"
			width={40}
			height={40}
			unoptimized
			className="bg-kumo-subtle rounded"
		/>
	);
}
