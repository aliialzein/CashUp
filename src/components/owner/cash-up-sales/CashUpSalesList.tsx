'use client';
import { useState } from 'react';
import type { OwnerCashUpDetailDto } from '../../../modules/cash-ups/cash-ups.types';
import { ownerDate, ownerMoney } from '../owner-format';
import ReviewFlags from '../cash-up-review/ReviewFlags';

const methods = { CASH: 'Cash', WHISH: 'Whish', OMT: 'OMT' };
const statuses = { TO_DELIVER: 'To deliver', DELIVERED: 'Delivered', DELETED: 'Deleted' };
function pair(usd: string | null, lbp: string | null) {
  if (usd === null && lbp === null) return 'Not collected';
  return ownerMoney(usd) + ' USD · ' + ownerMoney(lbp) + ' LBP';
}
export default function CashUpSalesList({ cashUp }: { cashUp: OwnerCashUpDetailDto }) {
  const [filter, setFilter] = useState<'ALL' | 'AWAITING_OWNER'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const sales = cashUp.review?.sales ?? [];
  const pendingIds = new Set(cashUp.requests.filter(request => request.status === 'AWAITING_OWNER').map(request => request.saleId));
  const visible = filter === 'ALL' ? sales : sales.filter(sale => pendingIds.has(sale.id));
  return <div className="space-y-6">
    <div><p className="text-sm text-[#718078]">Cash-up / Sales</p>
      <h1 className="mt-1 text-2xl font-bold text-[#145B37]">Cash-up Sales</h1>
      <p className="mt-1 text-sm text-[#718078]">Sales recorded by {cashUp.staffName}</p></div>
    <div className="flex flex-wrap gap-2">
      {(['ALL', 'AWAITING_OWNER'] as const).map(value => <button key={value} type="button" onClick={() => setFilter(value)}
        className={'rounded-xl px-4 py-2 text-sm font-semibold transition ' + (filter === value ? 'bg-[#167344] text-white' : 'border border-[#DCE9E0] bg-white text-[#64756A] hover:bg-[#F7FAF8]')}>
        {value === 'ALL' ? 'All Sales (' + sales.length + ')' : 'Awaiting Owner (' + pendingIds.size + ')'}
      </button>)}
    </div>
    {!visible.length ? <div className="rounded-2xl border border-[#E2EBE5] bg-white p-8 text-center">
      <p className="font-medium text-[#145B37]">No sales found</p><p className="mt-1 text-sm text-[#718078]">There are no sales in this filter.</p>
    </div> : <div className="space-y-3">{visible.map(sale => {
      const requests = cashUp.requests.filter(request => request.saleId === sale.id);
      const edits = cashUp.edits.filter(edit => edit.saleId === sale.id);
      return <article key={sale.id} className="overflow-hidden rounded-2xl border border-[#E2EBE5] bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#145B37]">Sale #{sale.saleNumber}</h2>
              <span className="rounded-full bg-[#EAF5ED] px-3 py-1 text-xs font-medium text-[#167344]">{statuses[sale.status]}</span>
              {sale.deletionAwaiting && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Awaiting Owner</span>}
              {sale.amountDiffers && <span className="text-xs text-amber-800">Amount differs</span>}
              {sale.isEdited && <span className="text-xs text-[#718078]">Edited</span>}
            </div>
            <p className="text-xs text-[#718078]">{ownerDate(sale.createdAt)}</p>
            <p className="text-sm text-[#64756A]">{sale.method === null ? 'Not collected' : methods[sale.method]}</p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <p className="font-bold tabular-nums text-[#145B37]">{pair(sale.totalCollectedUsd, sale.totalCollectedLbp)}</p>
            <button type="button" onClick={() => setExpanded(expanded === sale.id ? null : sale.id)} aria-expanded={expanded === sale.id}
              className="rounded-lg border border-[#DCE9E0] px-3 py-2 text-sm font-medium text-[#167344] transition hover:bg-[#F7FAF8]">{expanded === sale.id ? 'Hide details' : 'View details'}</button>
          </div>
        </div>
        {expanded === sale.id && <div className="space-y-5 border-t border-[#E5EEE8] bg-[#FAFCFA] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[#145B37]">Sale Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Detail label="Business Amount" value={pair(sale.businessAmountUsd, sale.businessAmountLbp)} />
            <Detail label="Delivery Fee" value={pair(sale.deliveryFeeUsd, sale.deliveryFeeLbp)} />
            <Detail label="Tip" value={pair(sale.tipUsd, sale.tipLbp)} />
            <Detail label="Discount" value={pair(sale.discountUsd, sale.discountLbp)} />
            <Detail label="Change Given" value={pair(sale.changeGivenUsd, sale.changeGivenLbp)} />
            <Detail label="Collected (recorded)" value={pair(sale.totalCollectedUsd, sale.totalCollectedLbp)} />
            <Detail label="Client Number" value={sale.clientNumber ?? '—'} />
            <Detail label="Delivered At" value={sale.deliveredAt ? ownerDate(sale.deliveredAt) : 'Not delivered'} />
            <Detail label="Payment Method" value={sale.method === null ? 'Not collected' : methods[sale.method]} />
          </div>
          {sale.note && <Detail label="Note" value={sale.note} />}
          {requests.length > 0 && <ReviewFlags requests={requests} />}
          {edits.length > 0 && <div><h3 className="mb-3 text-sm font-semibold text-[#145B37]">Edit History</h3>
            <div className="space-y-2">{edits.map(edit => <div key={edit.id} className="rounded-xl bg-white p-3 text-sm">
              <p className="font-medium text-[#263B30]">{edit.field}</p>
              <p className="mt-1 text-xs text-[#718078]">{edit.oldValue ?? '—'} → {edit.newValue ?? '—'}</p>
              <p className="mt-1 text-xs text-[#718078]">Edited by {edit.editedByName} · {ownerDate(edit.createdAt)}</p>
            </div>)}</div>
          </div>}
          {sale.cancelReason && <Detail label="Cancel Reason" value={sale.cancelReason} />}
        </div>}
      </article>;
    })}</div>}
  </div>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-[#718078]">{label}</p>
    <p className="mt-1 wrap-break-word font-medium text-[#263B30]">{value}</p></div>;
}