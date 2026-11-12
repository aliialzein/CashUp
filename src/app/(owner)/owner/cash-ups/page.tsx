import { Suspense } from 'react';
import CashUpCard from '@/components/owner/cash-ups/CashUpCard';
import { listOwnerCashUps } from '@/modules/cash-ups/cash-ups.service';

async function CashUpsContent() {
  const cashUps = await listOwnerCashUps();
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-[#145B37] sm:text-3xl">Cash-ups</h1>
      <p className="mt-2 text-sm text-[#718077]">Review and manage all cash handling periods.</p></div>
    {cashUps.length ? <div className="space-y-4">{cashUps.map(cashUp => <CashUpCard key={cashUp.id} cashUp={cashUp} />)}</div> :
      <div className="rounded-2xl border border-dashed border-[#C9DED0] bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5ED] text-2xl text-[#167344]">▤</div>
        <h2 className="mt-4 font-semibold text-[#145B37]">Cash-ups will appear here</h2>
        <p className="mt-2 text-sm text-[#718077]">Your business has no recorded cash-ups yet.</p>
      </div>}
  </div>;
}
export default function CashUpsPage() {
  return <Suspense fallback={<p role="status">Loading cash-ups…</p>}><CashUpsContent /></Suspense>;
}