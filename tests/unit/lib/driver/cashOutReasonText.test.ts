import { describe, expect, it } from "@jest/globals";
import {
    OTHER_DETAIL_MAX_LENGTH,
    cashOutReasonLabel,
    parseReasonText,
    toReasonText,
} from "@/lib/driver/cash-out/reasonText";

describe("toReasonText (screen -> backend)", () => {
    it("sends the category name for Fuel, Supplier and Change top-up, ignoring any detail", () => {
        expect(toReasonText("Fuel", "")).toBe("Fuel");
        expect(toReasonText("Supplier", "leftover text")).toBe("Supplier");
        expect(toReasonText("Change top-up", "")).toBe("Change top-up");
    });

    it("sends \"Other: \" followed by the trimmed detail", () => {
        expect(toReasonText("Other", "  Car wash ")).toBe("Other: Car wash");
    });

    it("gives null for Other without a detail", () => {
        expect(toReasonText("Other", "")).toBeNull();
        expect(toReasonText("Other", "   ")).toBeNull();
    });

    it("gives null for a category the app does not know", () => {
        expect(toReasonText("Lunch", "")).toBeNull();
    });

    it("keeps the longest allowed detail within the backend's 200 characters", () => {
        expect(OTHER_DETAIL_MAX_LENGTH).toBe(193);
        expect(toReasonText("Other", "x".repeat(OTHER_DETAIL_MAX_LENGTH))).toHaveLength(200);
    });
});

describe("parseReasonText (backend -> screen)", () => {
    it("reads a plain category", () => {
        expect(parseReasonText("Change top-up")).toEqual({ reason: "Change top-up" });
    });

    it("splits at the first \": \", so a detail may contain one too", () => {
        expect(parseReasonText("Other: Car wash")).toEqual({ reason: "Other", detail: "Car wash" });
        expect(parseReasonText("Other: Parking: city centre")).toEqual({ reason: "Other", detail: "Parking: city centre" });
    });

    it("uses the category before the colon for any known category", () => {
        expect(parseReasonText("Fuel: generator")).toEqual({ reason: "Fuel", detail: "generator" });
    });

    it("turns text without a known category into Other, keeping the whole text", () => {
        expect(parseReasonText("Bank deposit")).toEqual({ reason: "Other", detail: "Bank deposit" });
        expect(parseReasonText("Lunch: team")).toEqual({ reason: "Other", detail: "Lunch: team" });
    });

    it("reads back exactly what toReasonText writes", () => {
        const written = toReasonText("Other", "Car wash");
        expect(written).not.toBeNull();
        expect(parseReasonText(written as string)).toEqual({ reason: "Other", detail: "Car wash" });
    });
});

describe("cashOutReasonLabel (what the list shows)", () => {
    it("shows the category alone, or with the detail", () => {
        expect(cashOutReasonLabel({ reason: "Fuel" })).toBe("Fuel");
        expect(cashOutReasonLabel({ reason: "Other", detail: "Car wash" })).toBe("Other: Car wash");
    });
});
