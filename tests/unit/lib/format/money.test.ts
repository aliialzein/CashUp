import { describe, expect, it } from "@jest/globals";
import {
	formatAmounts,
	formatMoney,
	formatNumber,
	formatOutflow,
	formatSignedAmounts,
	outflowParts,
} from "../../../../src/lib/format/money";

describe("formatNumber", () => {
	it("shows cents for USD and none for LBP", () => {
		expect(formatNumber("50", "USD")).toBe("50.00");
		expect(formatNumber("1000000", "LBP")).toBe("1,000,000");
	});

	it("adds a sign only when asked, and never to zero", () => {
		expect(formatNumber("15", "USD", { signed: true })).toBe("+15.00");
		expect(formatNumber("-5", "USD", { signed: true })).toBe("-5.00");
		expect(formatNumber("0", "LBP", { signed: true })).toBe("0");
	});
});

describe("formatMoney / formatAmounts", () => {
	it("adds the currency code", () => {
		expect(formatMoney("20", "USD")).toBe("20.00 USD");
	});

	it("keeps both currencies side by side, never mixed", () => {
		expect(formatAmounts({ usd: "20", lbp: "120000" })).toBe(
			"20.00 USD · 120,000 LBP",
		);
	});
});

describe("formatSignedAmounts", () => {
	it("shows a sign on each currency", () => {
		expect(formatSignedAmounts({ usd: "-7", lbp: "120000" })).toBe("-7.00 USD · +120,000 LBP");
	});
});

describe("formatOutflow", () => {
	it("shows only the currencies that have an amount", () => {
		expect(formatOutflow({ usd: "5", lbp: "0" })).toBe("-5.00 USD");
		expect(formatOutflow({ usd: "0", lbp: "200000" })).toBe("-200,000 LBP");
		expect(formatOutflow({ usd: "5", lbp: "200000" })).toBe("-5.00 USD · -200,000 LBP");
	});
});

describe("outflowParts", () => {
	it("gives one entry per currency that has an amount, for one line each in the desktop table", () => {
		expect(outflowParts({ usd: "5", lbp: "200000" })).toEqual(["-5.00 USD", "-200,000 LBP"]);
		expect(outflowParts({ usd: "5", lbp: "0" })).toEqual(["-5.00 USD"]);
		expect(outflowParts({ usd: "0", lbp: "200000" })).toEqual(["-200,000 LBP"]);
	});
});