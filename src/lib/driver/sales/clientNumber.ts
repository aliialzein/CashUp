/** What the client number field accepts while typing: digits, "+", spaces and dashes. Anything else keeps the previous value. */
const CLIENT_NUMBER_TYPING = /^[\d+ -]*$/;

export function isClientNumberInput(typed: string): boolean {
    return CLIENT_NUMBER_TYPING.test(typed);
}

/** What is sent: the number without spaces and dashes ("+961 70-123 456" -> "+96170123456"). The backend judges the format. */
export function toBackendClientNumber(typed: string): string {
    return typed.replace(/[\s-]/g, "");
}

/** A refusal that is about the client number, so its field is marked invalid. */
export function isClientNumberError(code: string | null): boolean {
    return code === "CLIENT_NUMBER_REQUIRED" || code === "INVALID_CLIENT_NUMBER";
}
