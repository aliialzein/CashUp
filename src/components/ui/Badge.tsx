import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<BadgeTone, string> = {
	neutral: "border-line-strong bg-surface text-ink",
	success: "border-success-line bg-success-bg text-success",
	warning: "border-warning-line bg-warning-bg text-warning",
	danger: "border-danger-line bg-danger-bg text-danger",
	info: "border-info-line bg-info-bg text-info",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
	return (
		<span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
			{children}
		</span>
	);
}
