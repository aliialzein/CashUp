import { totalCollected } from "@/lib/driver/sales/collected";
import type { CashOut, CashUpDetail, Sale } from "@/types/driver/cash-up";

/** Anything a delivered sale can carry besides its basics. */
type SaleExtras = Partial<Omit<Sale, "id" | "number" | "clientPhone" | "clientNumber" | "date" | "time" | "status" | "amount">>;

function delivered(
    number: number,
    clientPhone: string,
    date: string,
    time: string,
    usd: string,
    lbp: string,
    extras: SaleExtras = {},
): Sale {
    // The saved number has no spaces; "Shop sale" is only the display text of a sale without one.
    const clientNumber = clientPhone === "Shop sale" ? null : clientPhone.replace(/\s/g, "");
    return { id: `s-${number}`, number, clientPhone, clientNumber, date, time, status: "DELIVERED", amount: { usd, lbp }, ...extras };
}

function cashOut(id: string, reason: CashOut["reason"], time: string, usd: string, lbp: string, note?: string): CashOut {
    return { id, reason, time, note, amount: { usd, lbp }, isDeleted: false };
}

const LEDGER = {
    float: { usd: "50", lbp: "1000000" },
    received: { usd: "40", lbp: "620000" },
    changeGiven: { usd: "-3", lbp: "0" },
    cashOuts: { usd: "-5", lbp: "-200000" },
    expected: { usd: "82", lbp: "1420000" },
};

const SALES_42: Sale[] = [
    delivered(105, "+961 03 987 654", "27 Oct", "16:30", "25", "120000", {
        method: "CASH",
        deliveryFee: { usd: "2", lbp: "0" },
        tip: { usd: "1", lbp: "0" },
        changeGiven: { usd: "3", lbp: "0" },
        totalCollected: { usd: "28", lbp: "120000" },
        note: "Leave it at the door",
    }),
    delivered(104, "+961 70 123 456", "27 Oct", "08:45", "15", "0", {
        method: "WHISH",
        deliveryFee: { usd: "0", lbp: "50000" },
        discount: { usd: "3", lbp: "0" },
        totalCollected: { usd: "12", lbp: "50000" },
        amountDiffers: true,
    }),
    delivered(103, "Shop sale", "27 Oct", "08:35", "0", "500000", { method: "CASH" }),
];

const SALES_40: Sale[] = [
    delivered(102, "+961 03 111 222", "25 Oct", "17:10", "1000", "10000000", {
        method: "CASH",
        deliveryFee: { usd: "1", lbp: "0" },
        totalCollected: { usd: "1001", lbp: "10000000" },
        isEdited: true,
    }),
    delivered(101, "+961 71 333 444", "25 Oct", "14:25", "8", "0", { method: "OMT" }),
    delivered(100, "+961 76 555 666", "25 Oct", "12:40", "12", "150000", {
        method: "CASH",
        changeGiven: { usd: "0", lbp: "50000" },
    }),
    delivered(99, "Shop sale", "25 Oct", "10:05", "0", "200000", { method: "CASH" }),
    delivered(98, "+961 70 777 888", "25 Oct", "09:15", "10", "0", { method: "CASH" }),
];

const SALES_39: Sale[] = [
    delivered(97, "+961 03 999 000", "24 Oct", "15:20", "8", "100000", { method: "CASH" }),
    delivered(96, "Shop sale", "24 Oct", "11:30", "12", "200000", { method: "CASH" }),
];

// TODO(backend): replace with the cash-up from the API. The server calculates deliveredTotal.
const details: CashUpDetail[] = [
    {
        id: "c-42",
        number: 42,
        status: "SUBMITTED",
        submittedAt: "27 Oct, 18:05",
        ledger: LEDGER,
        counted: { usd: "82", lbp: "1410000" },
        gap: { usd: "0", lbp: "-10000" },
        sales: SALES_42,
        cashOuts: [
            cashOut("co-42-2", "Supplier", "13:05", "2", "200000", "Bags and receipt paper"),
            cashOut("co-42-1", "Fuel", "09:20", "3", "0"),
        ],
        deliveredTotal: totalCollected(SALES_42),
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
        sales: SALES_40,
        cashOuts: [
            cashOut("co-40-2", "Supplier", "15:30", "0", "200000"),
            cashOut("co-40-1", "Fuel", "11:10", "5", "0"),
        ],
        deliveredTotal: totalCollected(SALES_40),
        review: { at: "26 Oct, 09:10" },
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
        sales: SALES_39,
        cashOuts: [],
        deliveredTotal: totalCollected(SALES_39),
        review: { at: "25 Oct, 08:55" },
    },
];

export function findMockCashUpDetail(id: string): CashUpDetail | undefined {
    return details.find((detail) => detail.id === id);
}
