import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Error message shown under the field. Also turns the border red. */
  error?: string;
  /** Turns the border red without a message (e.g. wrong email or password). */
  invalid?: boolean;
  hint?: string;
  /** Icon shown inside the field on the left. */
  leftIcon?: ReactNode;
  /** Element shown inside the field on the right (e.g. show/hide password). */
  rightSlot?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, invalid, hint, leftIcon, rightSlot, id, className = "", disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const hasError = Boolean(error) || Boolean(invalid);

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={error || hint ? messageId : undefined}
          className={[
            "h-11 w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400",
            "transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            leftIcon ? "pl-10" : "pl-3.5",
            rightSlot ? "pr-11" : "pr-3.5",
            hasError
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-[#12a15f] focus:ring-[#12a15f]/15",
            className,
          ].join(" ")}
          {...props}
        />

        {rightSlot && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{rightSlot}</span>
        )}
      </div>

      {error ? (
        <p id={messageId} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
