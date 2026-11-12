import { describe, expect, it } from "@jest/globals";
import { createSaleSchema, editSaleSchema, validateMergedSale, type MergedSaleCurrent } from "@/modules/sales/sales.validation";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { toOrderFields, toPendingSaleInput } from "@/lib/driver/sales/backendSaleInput";
import { toBackendClientNumber } from "@/lib/driver/sales/clientNumber";
import type { SaleDetails } from "@/lib/driver/sales/saleWriteGateway";

const DETAILS: SaleDetails = {
    amount: { usd: "10.00", lbp: "0.00" },
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    discount: { usd: "0.00", lbp: "0.00" },
    clientNumber: "+96170123456",
    note: null,
};

/** A saved "to deliver" sale as the backend's validateMergedSale reads it: no payment yet. */
const SAVED_PENDING_SALE: MergedSaleCurrent = {
    status: "TO_DELIVER",
    businessAmountUsd: "10.00",
    businessAmountLbp: "0.00",
    deliveryFeeUsd: "2.00",
    deliveryFeeLbp: "0.00",
    discountUsd: "0.00",
    discountLbp: "0.00",
    tipUsd: null,
    tipLbp: null,
    totalCollectedUsd: null,
    totalCollectedLbp: null,
    changeGivenUsd: null,
    changeGivenLbp: null,
    method: null,
    clientNumber: "+96170123456",
    note: null,
};

/** The code the screen gets when a real backend schema refuses. */
function refusalCode(result: { success: boolean; error?: unknown }): string {
    expect(result.success).toBe(false);
    return toErrorCode(result.error);
}

describe("toPendingSaleInput (Add sale)", () => {
    it("sends the client number when there is one", () => {
        expect(toPendingSaleInput(DETAILS)).toHaveProperty("clientNumber", "+96170123456");
        expect(createSaleSchema.safeParse(toPendingSaleInput(DETAILS)).success).toBe(true);
    });

    it.each(["", " - "])(
        "leaves an empty client number (%j once cleaned) out, so the backend asks for one",
        (typed) => {
            const input = toPendingSaleInput({ ...DETAILS, clientNumber: toBackendClientNumber(typed) });

            expect(input).not.toHaveProperty("clientNumber");
            expect(refusalCode(createSaleSchema.safeParse(input))).toBe("CLIENT_NUMBER_REQUIRED");
        },
    );
});

describe("toOrderFields (Edit sale)", () => {
    it("sends a cleared client number as null, so the backend refuses it instead of keeping the old one", () => {
        const changes = toOrderFields({ clientNumber: "" });
        expect(changes).toEqual({ clientNumber: null });

        const parsed = editSaleSchema.parse(changes);
        expect(refusalCode(validateMergedSale(SAVED_PENDING_SALE, parsed))).toBe("CLIENT_NUMBER_REQUIRED");
    });

    it("leaves a client number that was not changed out of the edit", () => {
        expect(toOrderFields({ note: "Gate 2" })).toEqual({ note: "Gate 2" });
    });
});
