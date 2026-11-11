import type { Amounts } from "@/lib/format/money";
import type { CashUp, Sale } from "@/types/driver/cash-up";
import { recalculateMockCashUp } from "./recalculateCashUp";
import { withScenario } from "./scenarios";

/**
 * Fake data so the screens can be built before the API exists.
 * Later, replace the import of this file with the real fetch; the components stay the same.
 */
const sales: Sale[] = [
    {
        id: "s-105",
        number: 105,
        clientPhone: "+961 03 987 654",
        clientNumber: "+96103987654",
        time: "09:14",
        status: "TO_DELIVER",
        amount: { usd: "20", lbp: "120000" },
        deliveryFee: { usd: "2", lbp: "0" },
    },
    {
        id: "s-104",
        number: 104,
        clientPhone: "+961 70 123 456",
        clientNumber: "+96170123456",
        time: "08:45",
        status: "DELIVERED",
        amount: { usd: "15", lbp: "0" },
        // Delivered sales carry their payment, as the backend's do: paid in cash, exactly the amount.
        method: "CASH",
        totalCollected: { usd: "15", lbp: "0" },
    },
    {
        id: "s-103",
        number: 103,
        clientPhone: "Shop sale",
        clientNumber: null,
        time: "08:35",
        status: "DELIVERED",
        amount: { usd: "0", lbp: "500000" },
        method: "CASH",
        totalCollected: { usd: "0", lbp: "500000" },
    },
];

const NONE: Amounts = { usd: "0", lbp: "0" };

const fullOpenCashUp: CashUp = {
    id: "cu-042",
    number: 42,
    status: "OPEN",
    returned: null,
    // status: "RETURNED",
    // returned: { by: "Ali", text: "Please recount the LBP notes" },
    startedAt: "27 Oct, 08:30",
    // Only the float is set here. Every other total is computed below by recalculateMockCashUp,
    // like the backend computes them (expected: $60 and 1,300,000 LBP with this data).
    ledger: { float: { usd: "50", lbp: "1000000" }, received: NONE, changeGiven: NONE, cashOuts: NONE, expected: NONE },
    salesCount: 0,
    salesTotal: NONE,
    // counted: { usd: "70", lbp: "1620000" },
    counted: null,
    savedCounts: null,
    deliveredTotal: NONE,
    waitingTotal: NONE,
    sales,
    cashOuts: [
        { id: "co-2", reason: "Fuel", time: "10:20", note: "Filled the motorbike", amount: { usd: "0", lbp: "200000" }, isDeleted: false },
        { id: "co-1", reason: "Supplier", time: "09:40", note: "Water bottles", amount: { usd: "5", lbp: "0" }, isDeleted: false },
    ],
};

/** The open cash-up as the chosen scenario shows it (see `scenarios.ts`), with its totals computed. */
export const mockOpenCashUp: CashUp = recalculateMockCashUp(withScenario(fullOpenCashUp));

export function findMockSale(id: string): Sale | undefined {
    return mockOpenCashUp.sales.find((sale) => sale.id === id);
}
