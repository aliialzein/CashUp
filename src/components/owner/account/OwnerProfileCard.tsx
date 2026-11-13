type OwnerProfileCardProps = { fullName: string; email: string; role: string };

export function OwnerProfileCard({ fullName, email, role }: OwnerProfileCardProps) {
  return (
    <section className="flex flex-col items-center gap-2.5 rounded-xl border border-line bg-surface px-6 py-7 text-center">
      <span
        aria-hidden="true"
        className="flex size-18 items-center justify-center rounded-full bg-ink text-[26px] font-bold text-white"
      >
        {fullName.trim().charAt(0).toUpperCase()}
      </span>
      <h2 className="text-xl font-bold text-ink">{fullName}</h2>
      <p className="text-sm text-muted">{email}</p>
      <span className="inline-flex items-center rounded-md border border-line-strong bg-surface px-2 py-0.5 text-xs font-semibold text-ink">
        {role}
      </span>
    </section>
  );
}
