export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
/** From this length on, a password that follows every rule counts as strong. */
/** With every rule met, 12 characters or more count as strong. */
export const STRONG_PASSWORD_LENGTH = 12;
/** With every rule met, 16 characters or more count as very strong. */
export const VERY_STRONG_PASSWORD_LENGTH = 16;

export type PasswordChange = { current: string; next: string; repeat: string };

export type PasswordErrors = { next?: string; repeat?: string };

export type PasswordStrength = "weak" | "moderate" | "strong" | "very-strong";

/** The first broken rule about the password itself, or `undefined` when it follows all of them. */
function ruleProblem(password: string): string | undefined {
    if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
    if (!/[a-z]/.test(password)) return "Add a lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Add an uppercase letter.";
    if (!/\d/.test(password)) return "Add a number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Add a symbol, like ! or #.";
    return undefined;
}

function newPasswordProblem({ current, next }: PasswordChange): string | undefined {
    return ruleProblem(next) ?? (next === current ? "Choose a different password." : undefined);
}

/** Messages for the fields the driver already typed in. Empty fields show no error yet. */
export function passwordErrors(change: PasswordChange): PasswordErrors {
    const errors: PasswordErrors = {};
    if (change.next !== "") errors.next = newPasswordProblem(change);
    if (change.repeat !== "" && change.repeat !== change.next) errors.repeat = "Passwords do not match.";
    return errors;
}

export function isPasswordChangeValid(change: PasswordChange): boolean {
    return change.current !== "" && newPasswordProblem(change) === undefined && change.repeat === change.next;
}

export function passwordStrength(password: string): PasswordStrength {
    if (ruleProblem(password) !== undefined)
        return "weak";

    if (password.length >= VERY_STRONG_PASSWORD_LENGTH)
        return "very-strong";

    if (password.length >= STRONG_PASSWORD_LENGTH)
        return "strong";

    return "moderate";
}

