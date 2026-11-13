import { Suspense } from "react";
import { Plus } from "lucide-react";
import InviteStaffCard from "@/components/owner/team/InviteStaffCard";
import StaffList from "@/components/owner/team/StaffList";
import Link from "next/link";
import { buttonVariantClasses } from "@/components/ui/driver/Button";
import { routes } from "@/lib/routes";
import { listMembers } from "@/modules/business/business.service";

async function TeamContent() {
  const members = await listMembers();
  const staff = members.filter((member) => member.role !== "OWNER");

  if (staff.length === 0) return <InviteStaffCard />;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Your staff</h2>
          <p className="mt-1 text-sm text-muted">Everyone who joined with one of your codes.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap rounded-full border border-line bg-subtle px-3 py-1.5 text-xs font-semibold text-muted sm:text-sm">
            {staff.length} member{staff.length === 1 ? "" : "s"}
          </span>
          <Link
            href={routes.owner.invite}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${buttonVariantClasses("primary")}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add staff
          </Link>
        </div>
      </div>

      <StaffList staff={staff} />
    </section>
  );
}

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Team</h1>
        <p className="mt-1 text-sm text-muted">Manage your drivers and invite new ones.</p>
      </div>

      <Suspense fallback={<p role="status" className="text-sm text-muted">Loading your team…</p>}>
        <TeamContent />
      </Suspense>
    </div>
  );
}
