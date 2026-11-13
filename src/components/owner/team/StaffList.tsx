import type { MemberDto } from "@/modules/business/business.types";
import StaffCard from "./StaffCard";

export default function StaffList({ staff }: { staff: readonly MemberDto[] }) {
  return (
    <div className="space-y-3">
      {staff.map((member) => (
        <StaffCard key={member.id} staff={member} />
      ))}
    </div>
  );
}
