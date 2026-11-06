import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function TextField({ label, ...props }: TextFieldProps) {
	return (
		<label className="flex flex-col gap-2">
			<span className="text-xs font-medium tracking-wider text-muted uppercase">{label}</span>
			<input
				className="min-h-12 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-ink"
				{...props}
			/>
		</label>
	);
}
