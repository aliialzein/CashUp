/** What the Submit button on Today can do now. Counting is not checked here: it is the next step of submitting. */
export type SubmitStep =
    | { kind: "deliver-first"; waitingCount: number }
    | { kind: "add-sale-first" }
    | { kind: "go-to-count" };

/** Waiting sales come first, because the count step only makes sense once every sale is delivered. */
export function submitStep(salesCount: number, waitingCount: number): SubmitStep {
    if (waitingCount > 0) return { kind: "deliver-first", waitingCount };
    if (salesCount === 0) return { kind: "add-sale-first" };
    return { kind: "go-to-count" };
}
