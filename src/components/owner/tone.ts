import type { Tone } from "@/lib/owner/cashUpOverview";

/** Badge colours per tone, from the theme tokens. */
export const TONE_BADGE: Record<Tone, string> = {
  neutral: "border-line bg-subtle text-muted",
  info: "border-info-line bg-info-bg text-info",
  warning: "border-warning-line bg-warning-bg text-warning",
  success: "border-success-line bg-success-bg text-success",
  danger: "border-danger-line bg-danger-bg text-danger",
};

/** Text colour per tone, for short status lines. */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted",
  info: "text-info",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
};
