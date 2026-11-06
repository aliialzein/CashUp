import type { Amounts } from "@/lib/format/money";
import type { CashUp } from "@/types/driver/cash-up";

export type MockScenario = "normal" | "empty-cash-up" | "no-open-cash-up" | "first-day";

// TODO(backend): delete with the mocks. Change this one value to preview a scenario.
export const MOCK_SCENARIO = "normal" as MockScenario;
// export const MOCK_SCENARIO = "empty-cash-up" as MockScenario;
// export const MOCK_SCENARIO = "no-open-cash-up" as MockScenario;
// export const MOCK_SCENARIO = "first-day" as MockScenario;


const ZERO: Amounts = { usd: "0", lbp: "0" };

/** The same cash-up with nothing recorded: only the opening float is in the drawer. */
function emptied(cashUp: CashUp): CashUp {
    return {
        ...cashUp,
        status: "OPEN",
        returned: null,
        counted: null,
        sales: [],
        salesCount: 0,
        salesTotal: ZERO,
        deliveredTotal: ZERO,
        waitingTotal: ZERO,
        cashOuts: [],
        ledger: {
            float: cashUp.ledger.float,
            received: ZERO,
            changeGiven: ZERO,
            cashOuts: ZERO,
            expected: cashUp.ledger.float,
        },
    };
}

/** Applies the chosen scenario to the open cash-up mock. */
export function withScenario(cashUp: CashUp): CashUp {
    return MOCK_SCENARIO === "empty-cash-up" ? emptied(cashUp) : cashUp;
}

export const hasOpenCashUp = MOCK_SCENARIO !== "no-open-cash-up" && MOCK_SCENARIO !== "first-day";
export const hasHistory = MOCK_SCENARIO !== "first-day";
