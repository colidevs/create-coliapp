import { HttpResponse, http } from "msw";

import { SESSION_COOKIE } from "@/lib/session";
import { mockedSession } from "@/mocks/data/session";

/**
 * Minimal MSW handler set for Phase 2 (auth/tenant layer) — session/
 * membership data only, enough for `verifySession()` (`src/lib/dal.ts`) and
 * `defineAbilityFor()` (`src/lib/ability.ts`) to have something real to
 * consume. Full `orders`-module MSW infrastructure (openapi.yaml-driven,
 * Orval-generated types/mocks per design decision D2) is Phase 3's job — do
 * not extend this file for that module.
 */
export const handlers = [
	http.get("*/api/v1/session", ({ request }) => {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const hasSessionCookie = cookieHeader.includes(`${SESSION_COOKIE}=`);

		if (!hasSessionCookie) {
			return HttpResponse.json(
				{
					type: "about:blank",
					title: "Unauthorized",
					status: 401,
					detail: "No session cookie present.",
				},
				{ status: 401 },
			);
		}

		return HttpResponse.json(mockedSession);
	}),
];
