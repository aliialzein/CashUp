import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	/** After a refused save that is about this field: a red border, and screen readers hear it is invalid. */
	invalid?: boolean;
};

export function TextField({ label, invalid = false, ...props }: TextFieldProps) {
	return (
		<label className="flex flex-col gap-2">
			<span className="text-xs font-medium tracking-wider text-muted uppercase">{label}</span>
			<input
				aria-invalid={invalid || undefined}
				className={`min-h-12 w-full rounded-[10px] border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-ink ${invalid ? "border-danger" : "border-line-strong"}`}
				{...props}
			/>
		</label>
	);
}
