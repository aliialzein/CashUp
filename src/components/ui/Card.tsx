import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
	/** The HTML element to render, e.g. "section" for a labelled block. */
	as?: "div" | "section" | "article";
};

export function Card({ as: Tag = "div", className = "", ...props }: CardProps) {
	return <Tag className={`rounded-xl border border-line bg-surface ${className}`.trim()} {...props} />;
}
