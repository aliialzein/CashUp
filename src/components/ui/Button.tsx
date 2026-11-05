import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Shows a spinner and blocks clicks while waiting for the backend. */
  loading?: boolean;
  /** Label shown while loading, e.g. "Signing in...". Defaults to children. */
  loadingText?: string;
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[#0f2a5c] text-white shadow-sm shadow-[#0f2a5c]/25 hover:bg-[#143674] focus-visible:ring-[#0f2a5c]/40 disabled:bg-[#0f2a5c]/60",
  secondary:
    "border border-slate-200 bg-white text-[#0f2a5c] hover:bg-slate-50 focus-visible:ring-[#0f2a5c]/30 disabled:text-slate-400",
  ghost:
    "text-[#0f2a5c] hover:bg-slate-100 focus-visible:ring-[#0f2a5c]/30 disabled:text-slate-400",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    loading = false,
    loadingText,
    variant = "primary",
    fullWidth = false,
    type = "button",
    disabled,
    className = "",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold",
        "transition-colors focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed",
        fullWidth ? "w-full" : "",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && <Spinner />}
      <span>{loading ? (loadingText ?? children) : children}</span>
    </button>
  );
});
