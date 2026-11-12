import type { SaleDto } from "@/modules/sales/sales.types";
import { SaleData } from "@/types/owner/cash-up";

// mapper from SaleDto to SaleData

export function mapSaleDtoToSaleData(dto: SaleDto): SaleData {
  return {
    id: dto.id,
    cashUpId: dto.cashUpId,
    saleNumber: dto.saleNumber,
    status: dto.status,

    businessAmountUsd: Number(dto.businessAmountUsd),
    businessAmountLbp: Number(dto.businessAmountLbp),

    deliveryFeeUsd: Number(dto.deliveryFeeUsd),
    deliveryFeeLbp: Number(dto.deliveryFeeLbp),

    tipUsd: Number(dto.tipUsd),
    tipLbp: Number(dto.tipLbp),

    discountUsd: Number(dto.discountUsd),
    discountLbp: Number(dto.discountLbp),

    totalCollectedUsd: Number(dto.totalCollectedUsd),
    totalCollectedLbp: Number(dto.totalCollectedLbp),

    method: dto.method,

    changeGivenUsd: Number(dto.changeGivenUsd),
    changeGivenLbp: Number(dto.changeGivenLbp),

    clientNumber: dto.clientNumber,
    note: dto.note,

    amountDiffers: dto.amountDiffers,
    isEdited: dto.isEdited,
    deletionAwaiting: dto.deletionAwaiting,

    createdAt: new Date(dto.createdAt),
    deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : null,
    deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,

    cancelReason: dto.cancelReason,

    edits: [],
  };
}
