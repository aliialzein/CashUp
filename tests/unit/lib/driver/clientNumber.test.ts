import { describe, expect, it } from "@jest/globals";
import { isClientNumberError, isClientNumberInput, toBackendClientNumber } from "@/lib/driver/sales/clientNumber";

describe("isClientNumberInput (typing)", () => {
    it("accepts digits, +, spaces and dashes, and an empty field", () => {
        expect(isClientNumberInput("+961 70-123 456")).toBe(true);
        expect(isClientNumberInput("")).toBe(true);
    });

    it("refuses letters and other signs, so the field keeps its previous value", () => {
        expect(isClientNumberInput("70a")).toBe(false);
        expect(isClientNumberInput("(70) 123")).toBe(false);
        expect(isClientNumberInput("70.123")).toBe(false);
    });
});

describe("toBackendClientNumber (sending)", () => {
    it("removes spaces and dashes and keeps everything else", () => {
        expect(toBackendClientNumber("+961 70-123 456")).toBe("+96170123456");
        expect(toBackendClientNumber("  70123456 ")).toBe("70123456");
        expect(toBackendClientNumber("")).toBe("");
    });
});

describe("isClientNumberError", () => {
    it("is true only for the two client number refusals", () => {
        expect(isClientNumberError("CLIENT_NUMBER_REQUIRED")).toBe(true);
        expect(isClientNumberError("INVALID_CLIENT_NUMBER")).toBe(true);
        expect(isClientNumberError("VALIDATION_ERROR")).toBe(false);
        expect(isClientNumberError(null)).toBe(false);
    });
});
