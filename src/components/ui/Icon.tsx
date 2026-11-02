const PATHS = {
  plus: "M12 5v14M5 12h14",
  chevronRight: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 6-6 6 6 6",
  check: "m5 12 5 5 10-10",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
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
