import { describe, expect, it } from "@jest/globals";
import { saleTotalLabel } from "@/lib/driver/sales/saleLabels";

describe("saleTotalLabel (one sale's client paid minus change)", () => {
    it('says "Kept" for a cash sale: the money stayed in the drawer', () => {
        expect(saleTotalLabel("CASH")).toBe("Kept");
    });

    it("says which wallet received a Whish or OMT payment, never \"Kept\"", () => {
        expect(saleTotalLabel("WHISH")).toBe("Received by Whish");
        expect(saleTotalLabel("OMT")).toBe("Received by OMT");
    });

    it('falls back to "Kept" for a sale without a method', () => {
        expect(saleTotalLabel(undefined)).toBe("Kept");
    });
});
