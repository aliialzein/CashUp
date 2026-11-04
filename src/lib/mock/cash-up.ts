import type { CashUp, Sale } from "@/types/cash-up";
import { withScenario } from "./scenarios";

/**
 * Fake data so the screens can be built before the API exists.
 * Later, replace the import of this file with the real fetch; the components stay the same.
 */
const fullOpenCashUp: CashUp = {
    id: "cu-042",
    number: 42,
    status: "OPEN",
    returned: null,
    // status: "RETURNED",
    // returned: { by: "Ali", text: "Please recount the LBP notes" },
    startedAt: "27 Oct, 08:30",
    ledger: {
        float: { usd: "50", lbp: "1000000" },
        received: { usd: "15", lbp: "500000" },
        changeGiven: { usd: "0", lbp: "0" },
        cashOuts: { usd: "-5", lbp: "-200000" },
        expected: { usd: "60", lbp: "1300000" },
    },
    salesCount: 3,
    salesTotal: { usd: "35", lbp: "620000" },
    // counted: { usd: "70", lbp: "1620000" },
    counted: null,
    deliveredTotal: { usd: "15", lbp: "500000" },
    waitingTotal: { usd: "20", lbp: "120000" },
    sales: [
        {
            id: "s-105",
            number: 105,
            clientPhone: "+961 03 987 654",
            time: "09:14",
            status: "DELIVERED",
            amount: { usd: "20", lbp: "120000" },
            deliveryFee: { usd: "2", lbp: "0" },
        },
        {
            id: "s-104",
            number: 104,
            clientPhone: "+961 70 123 456",
            time: "08:45",
            status: "DELIVERED",
            amount: { usd: "15", lbp: "0" },
        },
        {
            id: "s-103",
            number: 103,
            clientPhone: "Shop sale",
            time: "08:35",
            status: "DELIVERED",
            amount: { usd: "0", lbp: "500000" },
        },
    ],
    cashOuts: [
        { id: "co-2", reason: "Fuel", time: "10:20", note: "Filled the motorbike", amount: { usd: "0", lbp: "200000" } },
        { id: "co-1", reason: "Supplier", time: "09:40", note: "Water bottles", amount: { usd: "5", lbp: "0" } },
    ],
};

/** The open cash-up as the chosen scenario shows it (see `scenarios.ts`). */
export const mockOpenCashUp: CashUp = withScenario(fullOpenCashUp);

export function findMockSale(id: string): Sale | undefined {
    return mockOpenCashUp.sales.find((sale) => sale.id === id);
}
