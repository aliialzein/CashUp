"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { saveCount, submitCashUpWithCount } from "@/lib/driver/count-cash/actions";
import { totalOfNotes } from "@/lib/driver/count-cash/calculations";
import { emptyCounts, type CashCount } from "@/lib/driver/count-cash/denominations";
import { todayAfter } from "@/lib/driver/count-cash/todayNotice";
import type { Amounts, Currency } from "@/lib/format/money";
import { subtractAmounts } from "@/lib/money/amounts";
import { CountBar } from "./CountBar";
import { CountControls } from "./CountControls";
import { CountFlowActions } from "./CountFlowActions";
import { CountTotals } from "./CountTotals";
import { CurrencyTabs } from "./CurrencyTabs";
import { NoteCards } from "./NoteCards";
import { NotesTable } from "./NotesTable";

type CountCashFormProps = {
    /** What the drawer should hold, per currency, calculated by the server. */
    expected: Amounts;
    /** The count saved earlier, loaded again so the driver can finish it. `null` starts from zero. */
    savedCounts: CashCount | null;
};

/**
 * The drawer count. The totals and the gap are for the screen only; the backend judges and freezes them at submit.
 * "This is my final count" decides which button works: Submit cash-up, or Save and finish later.
 */
export function CountCashForm({ expected, savedCounts }: CountCashFormProps) {
    const router = useRouter();
    const [usdCounts, setUsdCounts] = useState(savedCounts?.USD ?? emptyCounts("USD"));
    const [lbpCounts, setLbpCounts] = useState(savedCounts?.LBP ?? emptyCounts("LBP"));
    // Phone only: which currency's notes are on screen. Desktop shows both.
    const [currency, setCurrency] = useState<Currency>("USD");
    const [isFinal, setIsFinal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    const counted: Amounts = { usd: totalOfNotes(usdCounts), lbp: totalOfNotes(lbpCounts) };
    const gap = subtractAmounts(counted, expected);
    const count: CashCount = { USD: usdCounts, LBP: lbpCounts };

    // The currency on screen on the phone.
    const counts = currency === "USD" ? usdCounts : lbpCounts;
    const setCounts = currency === "USD" ? setUsdCounts : setLbpCounts;
    const nothingCounted = Object.values(counts).every((noteCount) => noteCount === 0);

    /** From the button at the end of a long list, so the other list starts at its top. */
    function switchCurrency() {
        setCurrency(currency === "USD" ? "LBP" : "USD");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /** Saves the count and goes back to Today, which says the count is saved. */
    async function save() {
        if (isFinal || isSending) return;
        setIsSending(true);
        setErrorCode(null);
        const result = await saveCount(count);

        if (!result.ok) {
            setIsSending(false);
            setErrorCode(result.code);
            return;
        }
        // Still "sending" until Today opens, so nothing can be clicked again on the way.
        router.push(todayAfter("count-saved"));
    }

    /** Saves the count, then submits. On success Today says the cash-up was submitted. */
    async function submit() {
        if (!isFinal || isSending) return;
        setIsSending(true);
        setErrorCode(null);
        const result = await submitCashUpWithCount(count);

        // Refused: the count stays saved and on screen, with the reason why.
        if (!result.ok) {
            setIsSending(false);
            setErrorCode(result.code);
            return;
        }
        router.push(todayAfter("submitted"));
    }

    const controls = {
        isFinal,
        onFinalChange: setIsFinal,
        isSending,
        errorMessage: errorCode && errorText(errorCode),
        onSubmit: submit,
        onSave: save,
    };

    return (
        <div className="flex flex-col gap-3 md:gap-6">
            {/* Phone: one currency at a time, with its total on the tab. */}
            <div className="flex flex-col gap-3 md:hidden">
                <CurrencyTabs value={currency} onChange={setCurrency} counted={counted} />
                <NoteCards currency={currency} counts={counts} onChange={setCounts} />
                <CountFlowActions
                    currency={currency}
                    isEmpty={nothingCounted}
                    onReset={() => setCounts(emptyCounts(currency))}
                    onSwitch={switchCurrency}
                />
            </div>

            {/* Desktop (option A): both currencies side by side, then one footer card with the totals and the controls. */}
            <div className="hidden grid-cols-2 items-start gap-6 md:grid">
                <NotesTable
                    currency="USD"
                    counts={usdCounts}
                    onChange={setUsdCounts}
                    onReset={() => setUsdCounts(emptyCounts("USD"))}
                />
                <NotesTable
                    currency="LBP"
                    counts={lbpCounts}
                    onChange={setLbpCounts}
                    onReset={() => setLbpCounts(emptyCounts("LBP"))}
                />
            </div>
            <Card className="hidden flex-col gap-5 p-6 md:flex">
                <CountTotals counted={counted} expected={expected} gap={gap} />
                <CountControls {...controls} />
            </Card>

            <div className="md:hidden">
                <CountBar counted={counted} expected={expected} gap={gap} {...controls} />
            </div>
        </div>
    );
}
