/** A join code has exactly this many characters (see redeemJoinCodeSchema in the backend). */
export const JOIN_CODE_LENGTH = 12;

export const ONBOARDING_ERRORS = {
    nameRequired: "Enter your business name.",
    codeRequired: "Enter the join code.",
    codeLength: `A join code has ${JOIN_CODE_LENGTH} letters and numbers.`,
} as const;

/** Capital letters without spaces or dashes, so a code typed by hand matches the owner's code. */
export function toJoinCode(raw: string): string {
    return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** The message to show, or undefined when the name can be sent. */
export function businessNameError(name: string): string | undefined {
    return name.trim() ? undefined : ONBOARDING_ERRORS.nameRequired;
}

/** The message to show, or undefined when the code can be sent. Expects a code already cleaned by toJoinCode. */
export function joinCodeError(code: string): string | undefined {
    if (!code) return ONBOARDING_ERRORS.codeRequired;
    if (code.length !== JOIN_CODE_LENGTH) return ONBOARDING_ERRORS.codeLength;
    return undefined;
}
