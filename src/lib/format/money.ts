import { hasAmount } from "./amountInput";

export type Currency = "USD" | "LBP";
/** One value per currency, kept as decimal strings. We never add USD and LBP together. */
export type Amounts = { usd: string; lbp: string };

// USD shows cents, LBP has no decimals.
const DECIMALS: Record<Currency, number> = { USD: 2, LBP: 0 };

const formatters: Record<string, Intl.NumberFormat> = {};

function getFormatter(currency: Currency, signed: boolean): Intl.NumberFormat {
	const key = `${currency}-${signed}`;
	formatters[key] ??= new Intl.NumberFormat("en-US", {
		minimumFractionDigits: DECIMALS[currency],
		maximumFractionDigits: DECIMALS[currency],
		signDisplay: signed ? "exceptZero" : "auto",
	});
	return formatters[key];
}

/** "1000000" -> "1,000,000". With signed: "+15.00" / "-5.00" (zero gets no sign). */
export function formatNumber(
	value: string,
	currency: Currency,
	options: { signed?: boolean } = {},
): string {
	return getFormatter(currency, options.signed ?? false).format(value as Intl.StringNumericLiteral);
}

/** "20" -> "20.00 USD" */
export function formatMoney(value: string, currency: Currency): string {
	return `${formatNumber(value, currency)} ${currency}`;
}

/** { usd: "20", lbp: "120000" } -> "20.00 USD · 120,000 LBP" */
export function formatAmounts(amounts: Amounts): string {
	return `${formatMoney(amounts.usd, "USD")} · ${formatMoney(amounts.lbp, "LBP")}`;
}

/** { usd: "-7", lbp: "120000" } -> "-7.00 USD · +120,000 LBP" (zero gets no sign) */
export function formatSignedAmounts(amounts: Amounts): string {
	return `${formatNumber(amounts.usd, "USD", { signed: true })} USD · ${formatNumber(amounts.lbp, "LBP", { signed: true })} LBP`;
}

/** Money leaving the drawer. Shows only the currencies that have an amount: "-5.00 USD" or "-5.00 USD · -200,000 LBP". */
export function formatOutflow(amounts: Amounts): string {
	const parts: string[] = [];

	if (hasAmount(amounts.usd))
		parts.push(formatMoney(`-${amounts.usd}`, "USD"));

	if (hasAmount(amounts.lbp))
		parts.push(formatMoney(`-${amounts.lbp}`, "LBP"));

	return parts.join(" · ");
}
