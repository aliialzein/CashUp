interface TopStatsCardsProps {
  toReview: number;
  requestsWaiting: number;
  openNow: number;
}

export default function TopStatsCards({ toReview, requestsWaiting, openNow }: TopStatsCardsProps) {
  const stats = [
    { label: "To review", value: toReview },
    { label: "Requests waiting", value: requestsWaiting },
    { label: "Open now", value: openNow },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="space-y-2 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{stat.label}</span>
          <div className="text-3xl font-bold tabular-nums text-ink">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
