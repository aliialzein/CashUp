/** "#040" */
export function formatCashUpNumber(number: number): string {
    return `#${String(number).padStart(3, "0")}`;
}

/** "Cash-up #040" */
export function cashUpLabel(number: number): string {
    return `Cash-up ${formatCashUpNumber(number)}`;
}
