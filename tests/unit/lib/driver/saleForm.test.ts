import { describe, expect, it } from "@jest/globals";
import { EMPTY_SALE_FORM, changedSaleFields, saleToFormValues, toSaleFormInput, type SaleFormValues } from "@/lib/driver/sales/saleForm";
import type { Sale } from "@/types/driver/cash-up";

const SAVED_SALE: Sale = {
    id: "s-1",
    number: 1,
    clientPhone: "+96170123456",
    clientNumber: "+96170123456",
    time: "10:00",
    status: "TO_DELIVER",
    amount: { usd: "10.00", lbp: "500000.00" },
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    discount: { usd: "0.00", lbp: "0.00" },
    note: "Gate 2",
};

describe("saleToFormValues", () => {
    it("fills the form like typing would: LBP without decimals, zero as an empty field", () => {
        expect(saleToFormValues(SAVED_SALE)).toEqual({
            amount: { usd: "10.00", lbp: "500000" },
            deliveryFee: { usd: "2.00", lbp: "" },
            discount: { usd: "", lbp: "" },
            clientNumber: "+96170123456",
            note: "Gate 2",
        });
    });

    it("leaves the client number and note empty when the sale has none", () => {
        const values = saleToFormValues({ ...SAVED_SALE, clientNumber: null, clientPhone: "Shop sale", note: undefined });
        expect(values.clientNumber).toBe("");
        expect(values.note).toBe("");
    });
});

describe("changedSaleFields", () => {
    const saved: SaleFormValues = saleToFormValues(SAVED_SALE);

    it("finds no change when nothing changed", () => {
        expect(changedSaleFields(saved, saved)).toEqual({});
    });

    it("does not count a different way of writing the same thing as a change", () => {
        const sameThing: SaleFormValues = {
            ...saved,
            amount: { usd: "10", lbp: "500,000" },
            discount: { usd: "0", lbp: "" },
            clientNumber: "+961 70-123 456",
            note: "  Gate 2  ",
        };
        expect(changedSaleFields(saved, sameThing)).toEqual({});
    });

    it("returns only the changed fields, money ready to send (blank currency as \"0\")", () => {
        const edited: SaleFormValues = { ...saved, deliveryFee: { usd: "3", lbp: "" }, note: "" };
        expect(changedSaleFields(saved, edited)).toEqual({ deliveryFee: { usd: "3", lbp: "0" }, note: "" });
    });

    it("counts an unreadable amount as a change, so the action can refuse it", () => {
        const edited: SaleFormValues = { ...saved, amount: { usd: ".", lbp: "500000" } };
        expect(changedSaleFields(saved, edited)).toHaveProperty("amount");
    });
});

describe("toSaleFormInput", () => {
    it("turns every blank currency into \"0\" and keeps typed amounts as typed", () => {
        const values = { ...EMPTY_SALE_FORM, amount: { usd: "1,000.5", lbp: "" }, clientNumber: " 70123456 ", note: " Gate 2 " };

        expect(toSaleFormInput(values)).toEqual({
            amount: { usd: "1,000.5", lbp: "0" },
            deliveryFee: { usd: "0", lbp: "0" },
            discount: { usd: "0", lbp: "0" },
            clientNumber: " 70123456 ",
            note: " Gate 2 ",
        });
    });

    it("starts the form empty", () => {
        expect(EMPTY_SALE_FORM).toEqual({
            amount: { usd: "", lbp: "" },
            deliveryFee: { usd: "", lbp: "" },
            discount: { usd: "", lbp: "" },
            clientNumber: "",
            note: "",
        });
    });
});
