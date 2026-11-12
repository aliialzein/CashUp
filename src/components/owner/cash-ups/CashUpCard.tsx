import Link from 'next/link';
import type { OwnerCashUpSummaryDto } from '../../../modules/cash-ups/cash-ups.types';
import { ownerDate } from '../owner-format';

export default function CashUpCard({ cashUp }: { cashUp: OwnerCashUpSummaryDto }) {
  const latest = cashUp.requests[0];
  const waiting = cashUp.requests.some(request => request.canDecide);
  return <article className="flex flex-col gap-5 rounded-2xl border border-[#DCE9E0] bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 space-y-4">
      <div><h3 className="truncate text-base font-semibold text-[#145B37]">{cashUp.staffName}</h3>
        <p className="mt-1 text-sm text-[#718077]">Cash-up #{cashUp.number} · Opened {ownerDate(cashUp.openedAt)}</p></div>
      <span className="inline-block rounded-full bg-[#EAF5ED] px-3 py-1 text-xs font-semibold text-[#167344]">{cashUp.status}</span>
      <div className="rounded-xl bg-[#F7FAF8] p-3"><p className="text-xs font-medium text-[#718077]">Latest activity</p>
        <p className="mt-1 text-sm text-[#145B37]">{latest ? 'Delete sale request · ' + latest.status : cashUp.status === 'SUBMITTED' ? 'Cash-up submitted' : 'No requests yet'}</p>
      </div>
    </div>
    <Link href={'/owner/cash-ups/' + cashUp.id + '/review'} className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#167344] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#145B37]">
      {waiting ? 'Decide' : cashUp.status === 'SUBMITTED' && cashUp.canReview ? 'Review' : 'View'}
    </Link>
  </article>;
}