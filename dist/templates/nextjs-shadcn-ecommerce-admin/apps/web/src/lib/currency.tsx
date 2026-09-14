/**
 * Ported from munod (`munod/www/src/lib/currency.tsx`, hardcoded to `es-EC`/
 * `USD` for that specific deployment). Kept generic here — `Intl.NumberFormat`
 * defaults to the runtime's locale when none is passed, and `apps/api`'s
 * dLocal env vars (`DLOCAL_DEFAULT_CURRENCY`) already carry the real,
 * per-deployment currency; this module does not hardcode a project-specific
 * locale/currency pair.
 */
export function parseCurrency(
	value: number,
	currency = "USD",
	locale?: string,
) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(value);
}

export function Price({
	price,
	currency,
	locale,
}: {
	price: number;
	currency?: string;
	locale?: string;
}) {
	return <>{parseCurrency(price, currency, locale)}</>;
}
