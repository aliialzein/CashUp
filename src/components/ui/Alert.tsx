import type { ReactNode } from "react";

type Tone = "error" | "success" | "info";

export type AlertProps = {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  /** Optional close button handler. */
  onDismiss?: () => void;
};

const tones: Record<Tone, { box: string; icon: string }> = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: "text-red-500" },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "text-emerald-500" },
  info: { box: "border-sky-200 bg-sky-50 text-sky-800", icon: "text-sky-500" },
};

function Icon({ tone }: { tone: Tone }) {
  const path =
    tone === "success"
      ? "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      : tone === "info"
        ? "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
        : "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z";
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function Alert({ tone = "error", title, children, onDismiss }: AlertProps) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${t.box}`}
    >
      <span className={t.icon}>
        <Icon tone={tone} />
      </span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? "mt-0.5 opacity-90" : ""}>{children}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 rounded-md p-1 opacity-60 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
