import Link from "next/link";

const stats = [
  {
    title: "Open Cash-ups",
    description: "Currently in progress",
    icon: "◷",
  },
  {
    title: "Awaiting Review",
    description: "Submitted for review",
    icon: "▤",
  },
  {
    title: "Approved",
    description: "Successfully reviewed",
    icon: "✓",
  },
];

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section>
        <p className="text-sm font-medium text-[#218653]">OWNER WORKSPACE</p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#145B37] sm:text-3xl">
          Dashboard Overview
        </h1>

        <p className="mt-2 text-sm text-[#718077]">
          Manage your cash-ups and keep track of your business cash flow.
        </p>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-[#E5EEE8] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#718077]">
                {stat.title}
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5ED] text-lg text-[#167344]">
                {stat.icon}
              </span>
            </div>

            <p className="mt-4 text-sm text-[#718077]">{stat.description}</p>
          </div>
        ))}
      </section>

      {/* Cash-ups Section */}
      <section className="rounded-2xl border border-[#E5EEE8] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#145B37]">
              Cash-up Management
            </h2>

            <p className="mt-1 text-sm text-[#718077]">
              {"Review and manage your team's cash handling periods."}
            </p>
          </div>

          <Link
            href="/owner/cash-ups"
            className="inline-flex items-center justify-center rounded-xl bg-[#167344] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#145B37]"
          >
            View Cash-ups →
          </Link>
        </div>
      </section>
    </div>
  );
}
