import type { CashCount } from "@/lib/driver/count-cash/denominations";
import { addAmounts } from "@/lib/money/amounts";
import type { Amounts } from "@/lib/format/money";
import type { CashUpDto, CashUpLedgerDto, CashUpOwnDto } from "@/modules/cash-ups/cash-ups.types";
import type { CashUp, CashUpStatus, Ledger, Sale } from "@/types/driver/cash-up";
import { formatDay, formatTime } from "./businessTime";
import { mapCashOut, type CashOutInput } from "./cashOut";
import { mapSale, pair, type SaleLineInput } from "./sale";

/** The statuses a driver's own cash-up can have on screen. VOID never shows. */
export type OwnCashUpStatus = Exclude<CashUpDto["status"], "VOID">;

/** The drawer lines the backend computes (section 9.3 of the team notes). */
export type LedgerInput = CashUpLedgerDto;

/**
 * The fields of the driver's own cash-up that mapCashUp reads, taken from CashUpOwnDto.
 * Narrower than the backend on purpose: no VOID status, and the ledger is never null (the backend fills it while OPEN).
 */
export type CashUpInput = Pick<CashUpOwnDto, "id" | "number" | "returnReason" | "openedAt" | "countedUsd" | "countedLbp"> & {
    status: OwnCashUpStatus;
    ledger: LedgerInput;
    sales: readonly SaleLineInput[];
    cashOuts: readonly CashOutInput[];
    /** The saved count, already turned into screen note names by mapSavedCount. Left out = no count yet. */
    savedCounts?: CashCount | null;
};

const NO_MONEY: Amounts = pair("0.00", "0.00");

/** The backend's drawer totals as the screens show them. Only converted, never computed. */
export function toLedger(ledger: LedgerInput): Ledger {
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

/** What the delivered sales asked for, together. Used by Today and by a locked cash-up's Sales card. */
export function deliveredTotal(sales: Sale[]): Amounts {
    return sumAsked(sales.filter((sale) => sale.status === "DELIVERED"));
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
        savedCounts: dto.savedCounts ?? null,
        deliveredTotal: deliveredTotal(keptSales),
        waitingTotal: sumAsked(keptSales.filter((sale) => sale.status === "TO_DELIVER")),
        sales,
        cashOuts: dto.cashOuts.map(mapCashOut),
    };
}
