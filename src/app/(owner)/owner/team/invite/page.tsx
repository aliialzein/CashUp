import Link from "next/link";
import InviteCodeCard from "@/components/owner/team/InviteCodeCard";
import { routes } from "@/lib/routes";

export default function InviteStaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href={routes.owner.team} className="text-sm font-medium text-muted hover:text-ink">
          ← Back to Team
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">Invite staff</h1>
        <p className="mt-2 text-sm text-muted">Create a one-time code for a new driver.</p>
      </div>

      <InviteCodeCard />

      <p className="px-1 text-sm text-muted">
        Your driver signs up, chooses &quot;Join a business&quot; and types this code.
      </p>
    </div>
  );
}
