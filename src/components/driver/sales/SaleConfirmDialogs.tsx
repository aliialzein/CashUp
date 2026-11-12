"use client";

import { ConfirmWithReasonDialog, type ConfirmItem } from "@/components/driver/ConfirmWithReasonDialog";
import { deleteSale, requestSaleDeletion } from "@/lib/driver/sales/actions";
import { saleAmountLine } from "@/lib/driver/sales/collected";
import { formatAmounts } from "@/lib/format/money";
import type { Sale } from "@/types/driver/cash-up";

type SaleConfirmProps = {
    /** The sale the confirm is about. `null` keeps it closed. */
    sale: Sale | null;
    onClose: () => void;
    onDone: () => void;
};

/** The grey box: the sale number and the amount the list shows for it. */
function saleItem(sale: Sale | null): ConfirmItem | null {
    return sale && { id: sale.id, label: `Sale #${sale.number}`, amount: formatAmounts(saleAmountLine(sale).amounts) };
}

/** A "to deliver" sale, deleted directly with the driver's reason. */
export function DeleteSaleDialog({ sale, onClose, onDone }: SaleConfirmProps) {
    return (
        <ConfirmWithReasonDialog
            item={saleItem(sale)}
            title="Delete this sale?"
            text="It stays on record as deleted, and the owner sees your reason. You cannot undo this."
            confirmLabel="Delete sale"
            send={deleteSale}
            onClose={onClose}
            onDone={onDone}
        />
    );
}

/** A delivered sale is locked: the driver asks the owner to delete it. */
export function RequestSaleDeletionDialog({ sale, onClose, onDone }: SaleConfirmProps) {
    return (
        <ConfirmWithReasonDialog
            item={saleItem(sale)}
            title="Ask to delete this sale?"
            text="This sale is locked. The owner will approve or refuse your request."
            confirmLabel="Send request"
            send={requestSaleDeletion}
            onClose={onClose}
            onDone={onDone}
        />
    );
}
