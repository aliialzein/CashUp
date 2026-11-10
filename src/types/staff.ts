export type StaffMember = {
  id: string;
  fullName: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
  deactivatedAt: string | null;
};
