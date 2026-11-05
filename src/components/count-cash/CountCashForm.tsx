"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { totalOfNotes } from "@/lib/count-cash/calculations";
import { emptyCounts } from "@/lib/count-cash/denominations";
import type { Amounts, Currency } from "@/lib/format/money";
import { subtractAmounts } from "@/lib/money/amounts";
import { routes } from "@/lib/routes";
import { COUNT_CASH_FORM_ID } from "./formId";
import { CountBar } from "./CountBar";
import { CountFlowActions } from "./CountFlowActions";
import { CountSummary } from "./CountSummary";
import { CurrencyTabs } from "./CurrencyTabs";
import { NoteCards } from "./NoteCards";
import { NotesTable } from "./NotesTable";

type CountCashFormProps = {
    /** What the drawer should hold, per currency, calculated by the server. */
    expected: Amounts;
};

export function CountCashForm({ expected }: CountCashFormProps) {
    const router = useRouter();
    const [usdCounts, setUsdCounts] = useState(() => emptyCounts("USD"));
    const [lbpCounts, setLbpCounts] = useState(() => emptyCounts("LBP"));
    // Phone only: which currency's notes are on screen. Desktop shows both.
    const [currency, setCurrency] = useState<Currency>("USD");

    function reset() {
        setUsdCounts(emptyCounts("USD"));
        setLbpCounts(emptyCounts("LBP"));
        setCurrency("USD");
    }

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
        // TODO: send { usdCounts, lbpCounts } to the API.
        reset();
        router.push(routes.driver.today);
    }

    return (
        <form id={COUNT_CASH_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-6">
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
                <CountBar counted={counted} expected={expected} gap={gap} />
            </div>
        </form>
    );
}
