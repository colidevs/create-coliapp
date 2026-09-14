/**
 * Ported from munod (`munod/www/src/lib/session-cookie.ts`, which hardcodes
 * `"munod_session_token"`). Kept generic rather than project-specific, since
 * this is a template — `{{name}}` is not substituted into this value, it is
 * a fixed, deployment-independent cookie name.
 */
export const SESSION_COOKIE_NAME = "session_token";
