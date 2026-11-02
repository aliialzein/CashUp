import type { CashUp, Sale } from "@/types/cash-up";

/**
 * Fake data so the screens can be built before the API exists.
 * Later, replace the import of this file with the real fetch; the components stay the same.
 */
export const mockOpenCashUp: CashUp = {
    id: "cu-042",
    number: 42,
    status: "OPEN",
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
    deliveredTotal: { usd: "15", lbp: "500000" },
    waitingTotal: { usd: "20", lbp: "120000" },
    sales: [
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
    ],
};

export function findMockSale(id: string): Sale | undefined {
    return mockOpenCashUp.sales.find((sale) => sale.id === id);
}
