"use client";

import { ConfirmWithReasonDialog } from "@/components/driver/ConfirmWithReasonDialog";
import { cancelCashOut } from "@/lib/driver/cash-out/actions";
import { cashOutReasonLabel } from "@/lib/driver/cash-out/reasonText";
import { formatOutflow } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";

type DeleteCashOutDialogProps = {
    /** The cash-out to delete. `null` keeps the dialog closed. */
    cashOut: CashOut | null;
    /** "Keep it", Esc or a tap outside: closed without sending. */
    onClose: () => void;
    /** The backend deleted it. The list refreshes by itself (the action revalidates the page). */
    onDeleted: () => void;
};

/** Asks why the driver deletes a cash-out, then sends it. */
export function DeleteCashOutDialog({ cashOut, onClose, onDeleted }: DeleteCashOutDialogProps) {
    return (
        <ConfirmWithReasonDialog
            item={cashOut && { id: cashOut.id, label: cashOutReasonLabel(cashOut), amount: formatOutflow(cashOut.amount) }}
            title="Delete this cash-out?"
            text="It stays on record as deleted, and the owner sees your reason. You cannot undo this."
            confirmLabel="Delete cash-out"
            send={cancelCashOut}
            onClose={onClose}
            onDone={onDeleted}
        />
    );
}
