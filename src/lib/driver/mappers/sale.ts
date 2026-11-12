import type { Amounts } from "@/lib/format/money";
import type { SaleLineDto } from "@/modules/sales/sales.types";
import type { Sale } from "@/types/driver/cash-up";
import { formatDay, formatTime } from "./businessTime";

/**
 * The fields of the backend sale line that mapSale reads. Taken from SaleLineDto, so a backend rename
 * is a compile error here. Money is one string per currency ("0.00" means "none").
 * - moneyTaken: COLLECTED = the money is in the drawer, NOT_YET = still to collect, CANCELLED = deleted.
 * - The payment (method, tip, totalCollected, changeGiven) is null until the sale is delivered.
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
    | "deletionAwaiting"
    | "cancelReason"
>;

export function pair(usd: string, lbp: string): Amounts {
    return { usd, lbp };
}

/** Both currencies, or undefined while the backend has no value yet. A missing payment never becomes zeros. */
function optionalPair(usd: string | null, lbp: string | null): Amounts | undefined {
    if (usd === null || lbp === null) return undefined;
    return pair(usd, lbp);
}

/** Backend sale line -> the Sale the driver screens already use. */
export function mapSale(dto: SaleLineInput): Sale {
    const sale: Sale = {
        id: dto.id,
        number: dto.saleNumber,
        clientPhone: dto.clientNumber ?? "Shop sale",
        clientNumber: dto.clientNumber,
        time: formatTime(dto.createdAt),
        date: formatDay(dto.createdAt),
        status: dto.status,
        amount: pair(dto.businessAmountUsd, dto.businessAmountLbp),
        deliveryFee: pair(dto.deliveryFeeUsd, dto.deliveryFeeLbp),
        discount: pair(dto.discountUsd, dto.discountLbp),
        isEdited: dto.isEdited,
        amountDiffers: dto.amountDiffers,
        deletionAwaiting: dto.deletionAwaiting,
    };

    if (dto.note !== null) sale.note = dto.note;
    if (dto.cancelReason !== null) sale.cancelReason = dto.cancelReason;

    // The payment exists only once the sale is delivered: a "to deliver" sale gets none of these fields.
    if (dto.method !== null) sale.method = dto.method;
    const tip = optionalPair(dto.tipUsd, dto.tipLbp);
    if (tip) sale.tip = tip;
    const changeGiven = optionalPair(dto.changeGivenUsd, dto.changeGivenLbp);
    if (changeGiven) sale.changeGiven = changeGiven;
    // Only a collected sale has collected money (a deleted sale may still carry its old payment).
    const totalCollected = optionalPair(dto.totalCollectedUsd, dto.totalCollectedLbp);
    if (dto.moneyTaken === "COLLECTED" && totalCollected) sale.totalCollected = totalCollected;

    return sale;
}
