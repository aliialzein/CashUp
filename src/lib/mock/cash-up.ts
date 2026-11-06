import { addAmounts } from "@/lib/money/amounts";
import { totalCollected } from "@/lib/sales/collected";
import type { CashUp, Sale } from "@/types/cash-up";
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
        time: "09:14",
        status: "TO_DELIVER",
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
];

const delivered = sales.filter((sale) => sale.status === "DELIVERED");
const waiting = sales.filter((sale) => sale.status === "TO_DELIVER");

// TODO(backend): the server calculates these totals. Collected money only counts delivered sales.
const deliveredTotal = totalCollected(delivered);
const waitingTotal = waiting.reduce((sum, sale) => addAmounts(sum, sale.amount), { usd: "0", lbp: "0" });

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
        received: deliveredTotal,
        changeGiven: { usd: "0", lbp: "0" },
        cashOuts: { usd: "-5", lbp: "-200000" },
        expected: { usd: "60", lbp: "1300000" },
    },
    salesCount: sales.length,
    salesTotal: addAmounts(deliveredTotal, waitingTotal),
    // counted: { usd: "70", lbp: "1620000" },
    counted: null,
    deliveredTotal,
    waitingTotal,
    sales,
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
