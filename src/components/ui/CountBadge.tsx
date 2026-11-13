interface CountBadgeProps {
  count: number;
  variant?: "info" | "warning" | "success" | "danger";
}

const variants: Record<NonNullable<CountBadgeProps["variant"]>, string> = {
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
};

export default function CountBadge({
  count,
  variant = "info",
}: CountBadgeProps) {
  return (
    <span
      className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold ${variants[variant]}`}
    >
      {count}
    </span>
  );
}
