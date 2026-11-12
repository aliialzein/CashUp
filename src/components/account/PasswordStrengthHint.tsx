import { passwordStrength, type PasswordStrength } from "@/lib/account/password";

const STRENGTH: Record<PasswordStrength, { label: string; className: string }> = {
    weak: { label: "Weak", className: "text-danger" },
    moderate: { label: "Moderate", className: "text-warning" },
    strong: { label: "Strong", className: "text-success" },
    "very-strong": { label: "Very strong", className: "text-success" },
};

/** "Strength: Weak / Moderate / Strong / Very strong" under the new password. Hidden while the field is empty. */
export function PasswordStrengthHint({ password }: { password: string }) {
    if (password === "") return null;

    const { label, className } = STRENGTH[passwordStrength(password)];
    return (
        <p className="mt-1.5 text-[13px] text-muted">
            Strength: <span className={`font-semibold ${className}`}>{label}</span>
        </p>
    );
}
