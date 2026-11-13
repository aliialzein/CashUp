import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: Variant;
  fullWidth?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[#0f172a] text-white shadow-sm shadow-[#0f172a]/25 hover:bg-[#1e293b] focus-visible:ring-[#0f172a]/40 disabled:bg-[#0f172a]/60",
  secondary:
    "border border-[#e2e8f0] bg-[#ffffff] text-[#0f172a] hover:bg-[#f1f5f9] focus-visible:ring-[#0f172a]/30 disabled:text-[#475569]",
  ghost:
    "text-[#0f172a] hover:bg-[#f1f5f9] focus-visible:ring-[#0f172a]/30 disabled:text-[#475569]",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      loading = false,
      loadingText,
      variant = "primary",
      fullWidth = false,
      icon,
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
        {loading ? (
          <>
            <Spinner />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
