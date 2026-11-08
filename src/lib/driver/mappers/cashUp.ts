import { addAmounts } from "@/lib/money/amounts";
import type { Amounts } from "@/lib/format/money";
import type { CashUp, CashUpStatus, Ledger, Sale } from "@/types/driver/cash-up";
import { formatDay, formatTime } from "./businessTime";
import { mapCashOut, type CashOutInput } from "./cashOut";
import { mapSale, pair, type SaleLineInput } from "./sale";

/** The drawer lines the backend computes (section 9.3 of the team notes). */
export type LedgerInput = {
    floatUsd: string;
    floatLbp: string;
    receivedUsd: string;
    receivedLbp: string;
    changeGivenUsd: string;
    changeGivenLbp: string;
    cashOutsUsd: string;
    cashOutsLbp: string;
    expectedUsd: string;
    expectedLbp: string;
};

/** What the backend sends for the driver's own cash-up. VOID never reaches the screens. */
export type CashUpInput = {
    id: string;
    number: number;
    status: "OPEN" | "SUBMITTED" | "APPROVED";
    returnReason: string | null;
    openedAt: string;
    ledger: LedgerInput;
    countedUsd: string | null;
    countedLbp: string | null;
    sales: SaleLineInput[];
    cashOuts: CashOutInput[];
};

const NO_MONEY: Amounts = pair("0.00", "0.00");

function toLedger(ledger: LedgerInput): Ledger {
    return {
        float: pair(ledger.floatUsd, ledger.floatLbp),
        received: pair(ledger.receivedUsd, ledger.receivedLbp),
        changeGiven: pair(ledger.changeGivenUsd, ledger.changeGivenLbp),
        cashOuts: pair(ledger.cashOutsUsd, ledger.cashOutsLbp),
        expected: pair(ledger.expectedUsd, ledger.expectedLbp),
    };
}

/** Backend OPEN with a return reason is what the screens call RETURNED. */
export function toStatus(dto: Pick<CashUpInput, "status" | "returnReason">): CashUpStatus {
    return dto.status === "OPEN" && dto.returnReason !== null ? "RETURNED" : dto.status;
}

/** What one sale asks the client to pay: order amount plus delivery fee. */
function askedAmount(sale: Sale): Amounts {
    return addAmounts(sale.amount, sale.deliveryFee ?? NO_MONEY);
}

function sumAsked(sales: Sale[]): Amounts {
    return sales.reduce((total, sale) => addAmounts(total, askedAmount(sale)), NO_MONEY);
}

export function mapCashUp(dto: CashUpInput): CashUp {
    const sales = dto.sales.map(mapSale);
    const keptSales = sales.filter((sale) => sale.status !== "DELETED");
    const hasCount = dto.countedUsd !== null && dto.countedLbp !== null;

    return {
        id: dto.id,
        number: dto.number,
        status: toStatus(dto),
        returned: dto.returnReason === null ? null : { by: "Owner", text: dto.returnReason },
        startedAt: `${formatDay(dto.openedAt)}, ${formatTime(dto.openedAt)}`,
        ledger: toLedger(dto.ledger),
        salesCount: keptSales.length,
        salesTotal: sumAsked(keptSales),
        counted: hasCount ? pair(dto.countedUsd ?? "0.00", dto.countedLbp ?? "0.00") : null,
        // BACKEND GAP: the cash-up read has no count lines yet, so Count cash starts empty with real data.
        savedCounts: null,
        deliveredTotal: sumAsked(keptSales.filter((sale) => sale.status === "DELIVERED")),
        waitingTotal: sumAsked(keptSales.filter((sale) => sale.status === "TO_DELIVER")),
        sales,
        cashOuts: dto.cashOuts.map(mapCashOut),
    };
}
