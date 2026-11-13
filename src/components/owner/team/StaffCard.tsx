import type { MemberDto } from "@/modules/business/business.types";

const ROLE_LABEL: Record<MemberDto["role"], string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatJoined(date: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Beirut",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function StaffCard({ staff }: { staff: MemberDto }) {
  const isActive = staff.status === "ACTIVE";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-subtle text-sm font-bold text-ink">
          {getInitials(staff.fullName)}
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink">{staff.fullName}</h3>
          <p className="mt-1 text-sm text-muted">Joined {formatJoined(staff.joinedAt)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-full border border-info-line bg-info-bg px-3 py-1 text-xs font-semibold text-info">
          {ROLE_LABEL[staff.role]}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            isActive ? "border-success-line bg-success-bg text-success" : "border-danger-line bg-danger-bg text-danger"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
    </article>
  );
}
