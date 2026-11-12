import { StaffMember } from "@/types/owner/staff";

export type StaffCardProps = {
  staff: StaffMember;
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function StaffCard({ staff }: StaffCardProps) {
  const isActive = staff.status === "ACTIVE";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-sm font-bold text-[#0f172a]">
          {getInitials(staff.fullName)}
        </div>

        {/* Staff information */}
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#0f172a]">
            {staff.fullName}
          </h3>

          <p className="mt-1 text-sm text-[#475569]">
            Joined {formatDate(staff.joinedAt)}
          </p>
        </div>
      </div>

      {/* Role and status */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
          {staff.role === "STAFF" ? "Staff" : staff.role}
        </span>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            isActive
              ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
              : "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
    </article>
  );
}
