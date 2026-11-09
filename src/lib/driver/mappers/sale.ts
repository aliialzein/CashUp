import type { Amounts } from "@/lib/format/money";
import type { SaleLineDto } from "@/modules/sales/sales.types";
import type { Sale } from "@/types/driver/cash-up";
import { formatDay, formatTime } from "./businessTime";

/**
 * The fields of the backend sale line that mapSale reads. Taken from SaleLineDto, so a backend rename
 * is a compile error here. Money is one string per currency ("0.00" means "none").
 * - moneyTaken: COLLECTED = the money is in the drawer, NOT_YET = still to collect, CANCELLED = deleted.
 * - totalCollectedUsd/Lbp: what the sale collects, or will collect. Only a COLLECTED sale really holds it.
 */
export type SaleLineInput = Pick<
    SaleLineDto,
    | "id"
    | "saleNumber"
    | "status"
    | "moneyTaken"
    | "businessAmountUsd"
    | "businessAmountLbp"
    | "deliveryFeeUsd"
    | "deliveryFeeLbp"
    | "tipUsd"
    | "tipLbp"
    | "discountUsd"
    | "discountLbp"
    | "totalCollectedUsd"
    | "totalCollectedLbp"
    | "changeGivenUsd"
    | "changeGivenLbp"
    | "method"
    | "clientNumber"
    | "note"
    | "createdAt"
    | "isEdited"
    | "amountDiffers"
>;

export function pair(usd: string, lbp: string): Amounts {
    return { usd, lbp };
}

/** Backend sale line -> the Sale the driver screens already use. */
export function mapSale(dto: SaleLineInput): Sale {
    const sale: Sale = {
        id: dto.id,
        number: dto.saleNumber,
        clientPhone: dto.clientNumber ?? "Shop sale",
        time: formatTime(dto.createdAt),
        date: formatDay(dto.createdAt),
        status: dto.status,
        amount: pair(dto.businessAmountUsd, dto.businessAmountLbp),
        deliveryFee: pair(dto.deliveryFeeUsd, dto.deliveryFeeLbp),
        tip: pair(dto.tipUsd, dto.tipLbp),
        discount: pair(dto.discountUsd, dto.discountLbp),
        changeGiven: pair(dto.changeGivenUsd, dto.changeGivenLbp),
        method: dto.method,
        isEdited: dto.isEdited,
        amountDiffers: dto.amountDiffers,
    };

    if (dto.note !== null) sale.note = dto.note;
    // Only a collected sale has collected money. A waiting sale has none yet.
    if (dto.moneyTaken === "COLLECTED") {
        sale.totalCollected = pair(dto.totalCollectedUsd, dto.totalCollectedLbp);
    }

    return sale;
}
