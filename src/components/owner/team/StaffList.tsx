import { StaffMember } from "@/types/staff";
import StaffCard from "./StaffCard";

type StaffListProps = {
  staff: StaffMember[];
  loading?: boolean;
};

export default function StaffList({ staff, loading = false }: StaffListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-2xl border border-[#e2e8f0] bg-[#f1f5f9]"
          />
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-5 py-12 text-center">
        <p className="font-semibold text-[#0f172a]">No staff members yet</p>

        <p className="mt-2 text-sm text-[#475569]">
          Invite your first staff member to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {staff.map((member) => (
        <StaffCard key={member.id} staff={member} />
      ))}
    </div>
  );
}
