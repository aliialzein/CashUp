/**
 * In place of the totals of a locked cash-up while the backend sends them only for open cash-ups.
 * The totals are never computed on the frontend; they appear by themselves once the backend sends them.
 */
export function TotalsPending() {
    return <p className="text-sm text-muted">Totals will show here after the next update.</p>;
}
