const PATHS = {
	plus: "M12 5v14M5 12h14",
	chevronRight: "m9 6 6 6-6 6",
	chevronDown: "m6 9 6 6 6-6",
	chevronLeft: "m15 6-6 6 6 6",
	check: "m5 12 5 5 10-10",
	close: "M6 6l12 12M18 6 6 18",
	user: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0",
	lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
	fuel: "M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M5 21h10M15 9h2a2 2 0 0 1 2 2v6",
	truck: "M3 7h13v10H3zM16 10h3l2 3v4h-5",
	swap: "M7 7h11l-3-3M17 17H6l3 3",
	info: "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 8v4M12 16h.01",
	business: "M4 21V8l8-5 8 5v13M9 21v-6h6v6",
	globe: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
	eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
	eyeOff: "M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.1-.9M9.9 9.9a3 3 0 0 0 4.2 4.2",
	undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
	drawer: "M3 7h18v10H3zM12 10v4",
	done: "m5 12 5 5 9-10",
	sheet: "M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM8 9h8M8 13h5",
	tag: "M20 12l-8 8-8-8V4h8l8 8ZM8.5 8.5h.01",
	minus: "M5 12h14",
	clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2",
	trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = { name: IconName; size?: number; className?: string };

/** Decorative icon. The text next to it carries the meaning, so it is hidden from screen readers. */
export function Icon({ name, size = 20, className }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<path d={PATHS[name]} />
		</svg>
	);
}
