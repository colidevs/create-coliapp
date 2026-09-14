/**
 * Shared constant between `actions.ts` (writes it) and `return/page.tsx`
 * (reads it) — kept in its own plain module rather than exported from
 * `actions.ts`, since a `"use server"` file may only export async functions;
 * a plain string constant export from that file is a build-time error.
 */
export const LAST_CHECKOUT_COOKIE = "last_checkout";

export interface LastCheckout {
	orderId: string;
	dlocalId: string;
	status: string;
}
