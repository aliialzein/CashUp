import { describe, expect, it } from "@jest/globals";
import { findMockCashUpDetail } from "@/lib/driver/mock/cash-up-details";
import { keptAmounts } from "@/lib/driver/sales/collected";
import type { Amounts } from "@/lib/format/money";
import { addAmounts, isZeroAmounts, subtractAmounts } from "@/lib/money/amounts";
import type { Sale } from "@/types/driver/cash-up";

const NONE: Amounts = { usd: "0", lbp: "0" };
const MOCK_HISTORY_IDS = ["c-42", "c-40", "c-39"];

/** Order + delivery fee + tip − discount, per currency. Only this test computes it; the app reads the backend's flag. */
function owed(sale: Sale): Amounts {
    const withFeeAndTip = addAmounts(addAmounts(sale.amount, sale.deliveryFee ?? NONE), sale.tip ?? NONE);
    return subtractAmounts(withFeeAndTip, sale.discount ?? NONE);
}

const historySales = MOCK_HISTORY_IDS.flatMap((id) => findMockCashUpDetail(id)?.sales ?? []);

describe("mock history sales", () => {
    it("has the three mock cash-ups", () => {
        expect(MOCK_HISTORY_IDS.map((id) => findMockCashUpDetail(id)?.id)).toEqual(MOCK_HISTORY_IDS);
    });

    it.each(historySales.map((sale) => [sale.number, sale] as const))(
        'sale #%i shows "Amount differs" only when what was owed differs from what it kept',
        (_number, sale) => {
            const owedDiffersFromKept = !isZeroAmounts(subtractAmounts(owed(sale), keptAmounts(sale)));
            expect(sale.amountDiffers ?? false).toBe(owedDiffersFromKept);
        },
    );

    it("sale #104 (Whish, 15 USD − 3 discount + 50,000 LBP fee, paid 12 USD + 50,000 LBP) is not flagged", () => {
        const sale104 = historySales.find((sale) => sale.number === 104);
        expect(sale104?.amountDiffers ?? false).toBe(false);
    });
});
