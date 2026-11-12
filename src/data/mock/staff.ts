import { StaffMember } from "@/types/owner/staff";

export const mockStaffMembers: StaffMember[] = [
  {
    id: "m1000000-0000-4000-8000-000000000001",
    fullName: "Mohamad",
    role: "STAFF",
    status: "ACTIVE",
    joinedAt: "2026-10-01T08:00:00Z",
    deactivatedAt: null,
  },
  {
    id: "m1000000-0000-4000-8000-000000000002",
    fullName: "Rami",
    role: "STAFF",
    status: "ACTIVE",
    joinedAt: "2026-10-05T08:00:00Z",
    deactivatedAt: null,
  },
  {
    id: "m1000000-0000-4000-8000-000000000003",
    fullName: "Ali",
    role: "OWNER",
    status: "ACTIVE",
    joinedAt: "2026-09-15T08:00:00Z",
    deactivatedAt: null,
  },
  {
    id: "m1000000-0000-4000-8000-000000000009",
    fullName: "Admin Owner",
    role: "OWNER",
    status: "ACTIVE",
    joinedAt: "2026-09-01T08:00:00Z",
    deactivatedAt: null,
  },
];
