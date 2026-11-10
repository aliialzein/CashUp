"use client";

import { useRouter } from "next/navigation";

import InviteStaffCard from "@/components/owner/team/InviteStaffCard";
import StaffList from "@/components/owner/team/StaffList";
import { StaffMember } from "@/types/staff";
import { mockStaffMembers } from "@/data/mock/staff";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default function TeamPage() {
  const router = useRouter();

  // later i connect it to backend
  const staff: StaffMember[] = mockStaffMembers;
  const loading = false;
  const error = false;

  return (
    <div className="space-y-6 bg-[#f8fafc] min-h-screen text-[#0f172a]">
      {/* Condition: If staff length is 0 (or empty), show the first section / Invite card */}
      {staff.length === 0 && !loading ? (
        <div className="space-y-4">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl">
              Team
            </h1>
            <p className="mt-1 text-sm text-[#475569]">
              Manage your team members and permissions.
            </p>
          </div>
          <InviteStaffCard />
        </div>
      ) : (
        /* Staff members list section */
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">Your Staff</h2>
              <p className="mt-1 text-sm text-[#475569]">
                View and manage your team members.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {!loading && !error && (
                <span className="whitespace-nowrap rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-1.5 text-xs font-semibold text-[#475569] sm:text-sm">
                  {staff.length} members
                </span>
              )}

              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/owner/team/invite")}
              >
                Add Staff
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] p-4">
              <p className="text-sm font-medium text-[#be123c]">{error}</p>
            </div>
          ) : (
            <StaffList staff={staff} loading={loading} />
          )}
        </section>
      )}
    </div>
  );
}
