import { describe, expect, it } from "@jest/globals";
import { submitStep } from "@/lib/driver/cash-up/submitStep";

describe("submitStep", () => {
    it("asks to deliver first while sales are waiting, even with other sales delivered", () => {
        expect(submitStep(3, 1)).toEqual({ kind: "deliver-first", waitingCount: 1 });
    });

    it("asks for a sale first when the cash-up has none", () => {
        expect(submitStep(0, 0)).toEqual({ kind: "add-sale-first" });
    });

    it("leads to the count step once every sale is delivered", () => {
        expect(submitStep(3, 0)).toEqual({ kind: "go-to-count" });
    });
});
