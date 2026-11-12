import {
    buildCashLedger,
    type CashOutTotalsRowInput,
    type ChangeTotalsRowInput,
    type SaleTotalsRowInput,
} from "@/domain/money/cash-up-totals";
import type { Currency } from "@/lib/format/money";
import { saleTotals, toLedger } from "@/lib/driver/mappers/cashUp";
import type { Amounts } from "@/lib/format/money";
import type { CashOut, CashUp, Sale } from "@/types/driver/cash-up";

/**
 * Mock only: recalculates the open mock cash-up after every mock write, the way the real backend would answer.
 * The ledger is computed by the backend's own buildCashLedger (read-only import) from rows shaped like the backend's
 * (see mapOwnCashUp in src/modules/cash-ups/cash-ups.mapper.ts), then shown through the same toLedger as real data.
 * Nothing here adds money up itself. Delete together with the mock folder.
 */

const CURRENCIES: readonly Currency[] = ["USD", "LBP"];
const NONE: Amounts = { usd: "0", lbp: "0" };

function inCurrency(amounts: Amounts | undefined, currency: Currency): string {
    const value = (amounts ?? NONE)[currency === "USD" ? "usd" : "lbp"];
    return value === "" ? "0" : value;
}

/** A delivered mock sale without its payment is a mock data bug: fail loudly instead of guessing. */
function requirePayment(sale: Sale): { method: NonNullable<Sale["method"]>; collected: Amounts } {
    if (sale.method === undefined || sale.totalCollected === undefined) {
        throw new Error(`MOCK_DELIVERED_SALE_WITHOUT_PAYMENT: sale ${sale.number}`);
    }
    return { method: sale.method, collected: sale.totalCollected };
}

/** One row per currency for each delivered sale, as the backend builds them. */
function saleRows(delivered: Sale[]): SaleTotalsRowInput[] {
    return delivered.flatMap((sale) => {
        const { method, collected } = requirePayment(sale);
        return CURRENCIES.map((currency) => ({
            currency,
            method,
            count: 1,
            businessAmount: inCurrency(sale.amount, currency),
            deliveryFee: inCurrency(sale.deliveryFee, currency),
            totalCollected: inCurrency(collected, currency),
            tip: inCurrency(sale.tip, currency),
            discount: inCurrency(sale.discount, currency),
        }));
    });
}

function changeRows(delivered: Sale[]): ChangeTotalsRowInput[] {
    return delivered.flatMap((sale) => CURRENCIES.map((currency) => ({ currency, total: inCurrency(sale.changeGiven, currency) })));
}

/** Deleted cash-outs are passed as CANCELLED, so the backend's function leaves them out. */
function cashOutRows(cashOuts: CashOut[]): CashOutTotalsRowInput[] {
    return cashOuts.flatMap((cashOut) =>
        CURRENCIES.map((currency) => ({
            currency,
            total: inCurrency(cashOut.amount, currency),
            status: cashOut.isDeleted ? ("CANCELLED" as const) : ("ACTIVE" as const),
        })),
    );
}

/** Rebuilds the ledger and the sale cards' numbers of a mock cash-up from its sales and cash-outs, in place. */
export function recalculateMockCashUp(cashUp: CashUp): CashUp {
    const delivered = cashUp.sales.filter((sale) => sale.status === "DELIVERED");
    const ledger = buildCashLedger({
        floatUsd: inCurrency(cashUp.ledger.float, "USD"),
        floatLbp: inCurrency(cashUp.ledger.float, "LBP"),
        sales: saleRows(delivered),
        change: changeRows(delivered),
        cashOuts: cashOutRows(cashUp.cashOuts),
    });
    cashUp.ledger = toLedger(ledger);
    Object.assign(cashUp, saleTotals(cashUp.sales));
    return cashUp;
}
