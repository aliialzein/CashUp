import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "warning" | "danger" | "dangerOutline";

const BASE =
	"inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed";

const VARIANTS: Record<ButtonVariant, string> = {
	primary: "bg-ink text-white hover:bg-ink/90 disabled:bg-line-strong disabled:text-muted",
	secondary: "border border-ink bg-surface text-ink hover:bg-subtle disabled:border-line-strong disabled:text-muted",
	ghost: "text-ink hover:bg-subtle disabled:text-muted",
	warning: "border border-warning-line bg-warning-bg text-warning",
	danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-line-strong disabled:text-muted",
	dangerOutline: "border border-danger-line bg-surface text-danger hover:bg-danger-bg disabled:text-muted",
};

/** Only the colours of a variant, for a button with its own size (e.g. a small icon button in a list). */
export function buttonVariantClasses(variant: ButtonVariant): string {
	return VARIANTS[variant];
}

/** Shared by Button and ButtonLink, so a link can look exactly like a button. */
export function buttonClasses(variant: ButtonVariant = "primary", className = ""): string {
	return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	/** Shows a spinner and blocks clicks while a request is running. */
	loading?: boolean;
};

export function Button({ variant = "primary", loading = false, className, disabled, children, ...props }: ButtonProps) {
	return (
		<button
			type="button"
			className={buttonClasses(variant, className)}
			disabled={disabled || loading}
			aria-busy={loading}
			{...props}
		>
			<span className="inline-flex items-center gap-2">
				{loading && (
					<span
						aria-hidden="true"
						className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
					/>
				)}
				{children}
			</span>
		</button>
	);
}
