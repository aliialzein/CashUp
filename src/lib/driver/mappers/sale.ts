import type { Amounts } from "@/lib/format/money";
import type { Sale } from "@/types/driver/cash-up";
import { formatDay, formatTime } from "./businessTime";

/**
 * A sale line as the backend will send it: one value per currency, named like the cash-up
 * (floatUsd / floatLbp). "0.00" means "none". This is the agreed contract.
 * When the backend ships it, replace this type with `SaleLineDto` from "@/services/dto";
 * the compiler then shows any name that differs.
 */
export type SaleLineInput = {
    id: string;
    saleNumber: number;
    status: Sale["status"];
    /** COLLECTED: the money is in the drawer. NOT_YET: still to collect. CANCELLED: deleted. */
    moneyTaken: "COLLECTED" | "NOT_YET" | "CANCELLED";
    businessAmountUsd: string;
    businessAmountLbp: string;
    deliveryFeeUsd: string;
    deliveryFeeLbp: string;
    tipUsd: string;
    tipLbp: string;
    discountUsd: string;
    discountLbp: string;
    /** What the sale collects, or will collect. Only a COLLECTED sale really holds it. */
    totalCollectedUsd: string;
    totalCollectedLbp: string;
    changeGivenUsd: string;
    changeGivenLbp: string;
    method: NonNullable<Sale["method"]>;
    clientNumber: string | null;
    note: string | null;
    createdAt: string;
    isEdited: boolean;
    amountDiffers: boolean;
};

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
