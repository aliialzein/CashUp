import type { OwnerSaleDeletionRequestDto } from '../../../modules/cash-ups/cash-ups.types';
import { ownerDate } from '../owner-format';
import DeletionDecisionForm from './DeletionDecisionForm';

export default function ReviewFlags({ requests }: { requests: readonly OwnerSaleDeletionRequestDto[] }) {
  return <section className="rounded-2xl border border-[#E5EEE8] bg-white p-5 shadow-sm">
    <h2 className="mb-4 font-semibold text-[#145B37]">Requests & Flags</h2>
    {requests.length === 0 ? <p className="text-sm text-[#718078]">No requests for this cash-up.</p> :
      <div className="space-y-3">{requests.map(request => <div key={request.id} className="rounded-xl bg-[#F7FAF8] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[#263B30]">Delete sale {request.saleNumber === null ? '' : '#' + request.saleNumber}</p>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{request.status === 'AWAITING_OWNER' ? 'Awaiting owner' : request.status}</span>
        </div>
        <p className="mt-2 text-sm">{request.reason}</p>
        <p className="mt-1 text-xs text-[#718078]">Requested by {request.requestedByName} · {ownerDate(request.createdAt)}</p>
        {request.decidedAt && <div className="mt-2 text-sm">
          <p>Decision: {request.decisionReason}</p>
          <p className="text-xs text-[#718078]">{request.decidedByName} · {ownerDate(request.decidedAt)}{request.selfApproved ? ' · Self-approved' : ''}</p>
        </div>}
        {request.canDecide && <DeletionDecisionForm requestId={request.id} />}
      </div>)}</div>}
  </section>;
}
