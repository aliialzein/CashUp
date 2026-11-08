"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { saveCount, submitCashUp } from "@/lib/driver/cash-up/actions";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { totalOfNotes } from "@/lib/driver/count-cash/calculations";
import { emptyCounts, type CashCount } from "@/lib/driver/count-cash/denominations";
import type { Amounts, Currency } from "@/lib/format/money";
import { subtractAmounts } from "@/lib/money/amounts";
import { routes } from "@/lib/routes";
import { COUNT_CASH_FORM_ID, SUBMIT_INTENT } from "./formId";
import { CountBar } from "./CountBar";
import { CountFlowActions } from "./CountFlowActions";
import { CountSummary } from "./CountSummary";
import { CurrencyTabs } from "./CurrencyTabs";
import { NoteCards } from "./NoteCards";
import { NotesTable } from "./NotesTable";

type CountCashFormProps = {
    /** What the drawer should hold, per currency, calculated by the server. */
    expected: Amounts;
    /** The count saved earlier, shown again so the driver confirms or changes it. `null` starts from zero. */
    savedCounts: CashCount | null;
};

/** True when the button that sent the form is Submit. Save count sends it without a value. */
function isSubmitIntent(event: FormEvent<HTMLFormElement>): boolean {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    return submitter?.getAttribute("value") === SUBMIT_INTENT;
}

export function CountCashForm({ expected, savedCounts }: CountCashFormProps) {
    const router = useRouter();
    const [usdCounts, setUsdCounts] = useState(savedCounts?.USD ?? emptyCounts("USD"));
    const [lbpCounts, setLbpCounts] = useState(savedCounts?.LBP ?? emptyCounts("LBP"));
    // Phone only: which currency's notes are on screen. Desktop shows both.
    const [currency, setCurrency] = useState<Currency>("USD");
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);

    const counted: Amounts = { usd: totalOfNotes(usdCounts), lbp: totalOfNotes(lbpCounts) };
    const gap = subtractAmounts(counted, expected);

    // The currency on screen on the phone.
    const counts = currency === "USD" ? usdCounts : lbpCounts;
    const setCounts = currency === "USD" ? setUsdCounts : setLbpCounts;
    const nothingCounted = Object.values(counts).every((count) => count === 0);

    /** From the button at the end of a long list, so the other list starts at its top. */
    function switchCurrency() {
        setCurrency(currency === "USD" ? "LBP" : "USD");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // The header buttons live outside this component and cannot be disabled, so a second click stops here.
        if (isPending) return;

        const isSubmit = isSubmitIntent(event);
        const count: CashCount = { USD: usdCounts, LBP: lbpCounts };
        setErrorMessage(null);
        setIsSaved(false);

        startTransition(async () => {
            const result = isSubmit ? await submitCashUp(count) : await saveCount(count);
            if (!result.ok) {
                setErrorMessage(errorText(result.code));
                return;
            }
            if (isSubmit) {
                router.push(routes.driver.today);
                return;
            }
            setIsSaved(true);
        });
    }

    return (
        <form id={COUNT_CASH_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-6">
            {errorMessage && (
                <p role="alert" className="text-sm text-red-600">
                    {errorMessage}
                </p>
            )}
            {isSaved && (
                <p role="status" className="text-sm text-muted">
                    Count saved. You can recount, or submit when you are ready.
                </p>
            )}

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

            {/* Desktop: both currencies side by side, then the summary. */}
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
            <div className="hidden md:block">
                <CountSummary counted={counted} expected={expected} gap={gap} />
            </div>

            <div className="md:hidden">
                <CountBar counted={counted} expected={expected} gap={gap} isPending={isPending} />
            </div>
        </form>
    );
}
