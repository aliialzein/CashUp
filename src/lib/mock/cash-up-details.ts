import type { CashOut, CashUpDetail, Sale } from "@/types/cash-up";

function delivered(number: number, clientPhone: string, time: string, usd: string, lbp: string): Sale {
    return { id: `s-${number}`, number, clientPhone, time, status: "DELIVERED", amount: { usd, lbp } };
}

function cashOut(id: string, reason: CashOut["reason"], time: string, usd: string, lbp: string, note?: string): CashOut {
    return { id, reason, time, note, amount: { usd, lbp } };
}

const LEDGER = {
    float: { usd: "50", lbp: "1000000" },
    received: { usd: "40", lbp: "620000" },
    changeGiven: { usd: "-3", lbp: "0" },
    cashOuts: { usd: "-5", lbp: "-200000" },
    expected: { usd: "82", lbp: "1420000" },
};

// TODO(backend): replace with the cash-up from the API.
const details: CashUpDetail[] = [
    {
        id: "c-42",
        number: 42,
        status: "SUBMITTED",
        submittedAt: "27 Oct, 18:05",
        ledger: LEDGER,
        counted: { usd: "82", lbp: "1410000" },
        gap: { usd: "0", lbp: "-10000" },
        sales: [
            delivered(105, "+961 03 987 654", "16:30", "25", "120000"),
            delivered(104, "+961 70 123 456", "08:45", "15", "0"),
            delivered(103, "Shop sale", "08:35", "0", "500000"),
        ],
        cashOuts: [
            cashOut("co-42-2", "Supplier", "13:05", "2", "200000", "Bags and receipt paper"),
            cashOut("co-42-1", "Fuel", "09:20", "3", "0"),
        ],
        deliveredTotal: { usd: "40", lbp: "620000" },
        review: null,
    },
    {
        id: "c-40",
        number: 40,
        status: "APPROVED",
        submittedAt: "25 Oct, 18:20",
        ledger: LEDGER,
        counted: { usd: "82", lbp: "1420000" },
        gap: { usd: "0", lbp: "0" },
        sales: [
            delivered(102, "+961 03 111 222", "17:10", "10", "270000"),
            delivered(101, "+961 71 333 444", "14:25", "8", "0"),
            delivered(100, "+961 76 555 666", "12:40", "12", "150000"),
            delivered(99, "Shop sale", "10:05", "0", "200000"),
            delivered(98, "+961 70 777 888", "09:15", "10", "0"),
        ],
        cashOuts: [
            cashOut("co-40-2", "Supplier", "15:30", "0", "200000"),
            cashOut("co-40-1", "Fuel", "11:10", "5", "0"),
        ],
        deliveredTotal: { usd: "40", lbp: "620000" },
        review: { by: "Ali", at: "26 Oct, 09:10" },
    },
    {
        id: "c-39",
        number: 39,
        status: "APPROVED",
        submittedAt: "24 Oct, 17:40",
        ledger: {
            float: { usd: "50", lbp: "1000000" },
            received: { usd: "20", lbp: "300000" },
            changeGiven: { usd: "0", lbp: "0" },
            cashOuts: { usd: "0", lbp: "0" },
            expected: { usd: "70", lbp: "1300000" },
        },
        counted: { usd: "68", lbp: "1300000" },
        gap: { usd: "-2", lbp: "0" },
        sales: [
            delivered(97, "+961 03 999 000", "15:20", "8", "100000"),
            delivered(96, "Shop sale", "11:30", "12", "200000"),
        ],
        cashOuts: [],
        deliveredTotal: { usd: "20", lbp: "300000" },
        review: { by: "Ali", at: "25 Oct, 08:55" },
    },
];

export function findMockCashUpDetail(id: string): CashUpDetail | undefined {
    return details.find((detail) => detail.id === id);
}
