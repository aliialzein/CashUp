import { describe, expect, it } from "@jest/globals";
import { DEFAULT_REFERENCE_RATE_LBP, toBackendReferenceRate, toStartErrorCode } from "@/lib/driver/cash-up/referenceRate";

describe("DEFAULT_REFERENCE_RATE_LBP", () => {
    it("is 90,000 LBP per 1 USD", () => {
        expect(DEFAULT_REFERENCE_RATE_LBP).toBe("90000");
    });
});

describe("toBackendReferenceRate", () => {
    it("normalizes a typed rate with the LBP typing rules", () => {
        expect(toBackendReferenceRate("90000")).toBe("90000.00");
        expect(toBackendReferenceRate("89,500")).toBe("89500.00");
        expect(toBackendReferenceRate("90000.75")).toBe("90000.00");
    });

    it("sends no rate for a cleared field", () => {
        expect(toBackendReferenceRate("")).toBeUndefined();
        expect(toBackendReferenceRate("   ")).toBeUndefined();
    });

    it("gives null for a rate it cannot read", () => {
        expect(toBackendReferenceRate("9a")).toBeNull();
        expect(toBackendReferenceRate("90,00")).toBeNull();
    });
});

describe("toStartErrorCode", () => {
    it("words the backend's not-positive and not-money refusals for the rate", () => {
        expect(toStartErrorCode("MONEY_MUST_BE_POSITIVE")).toBe("REFERENCE_RATE_INVALID");
        expect(toStartErrorCode("INVALID_MONEY")).toBe("REFERENCE_RATE_INVALID");
    });

    it("passes every other code on", () => {
        expect(toStartErrorCode("REFERENCE_RATE_EXCEEDS_MAX")).toBe("REFERENCE_RATE_EXCEEDS_MAX");
        expect(toStartErrorCode("CASHUP_ALREADY_OPEN")).toBe("CASHUP_ALREADY_OPEN");
    });
});
