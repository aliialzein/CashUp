import { Suspense } from 'react';
import Link from 'next/link';
import { ownerCashUpPage } from '../../../queries';
import ReviewHeader from '@/components/owner/cash-up-review/ReviewHeader';
import CashSummary from '@/components/owner/cash-up-review/CashSummary';
import ReviewFlags from '@/components/owner/cash-up-review/ReviewFlags';
import ReviewActions from '@/components/owner/cash-up-review/ReviewActions';
import SalesOverview from '@/components/owner/cash-up-review/SalesOverview';

interface Props { params: Promise<{ cashUpId: string }> }
async function ReviewContent({ params }: Props) {
  const cashUp = await ownerCashUpPage((await params).cashUpId);
  return <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
    <Link href="/owner/cash-ups" className="text-sm text-[#167344]">← Cash-ups</Link>
    <ReviewHeader cashUp={cashUp} />
    {cashUp.returnReason && <p className="rounded-xl bg-amber-50 p-4">Return reason: {cashUp.returnReason}</p>}
    {cashUp.voidReason && <p className="rounded-xl bg-[#F7FAF8] p-4">Void reason: {cashUp.voidReason}</p>}
    {cashUp.review ? <CashSummary cashUp={cashUp.review} /> :
      <p className="rounded-2xl border border-[#E5EEE8] bg-white p-5 text-sm text-[#718078]">
        {cashUp.status === 'OPEN' ? 'Cash-up in progress. Financial details are available after submission to an eligible reviewer. Open sale-deletion requests can be decided below.' :
          'Financial review is restricted to the eligible reviewer under your business policy.'}
      </p>}
    <SalesOverview cashUp={cashUp} />
    <ReviewFlags requests={cashUp.requests} />
    {cashUp.status === 'SUBMITTED' && cashUp.canReview &&
      <ReviewActions cashUpId={cashUp.id} pendingRequests={cashUp.requests.filter(request => request.status === 'AWAITING_OWNER').length} />}
    {cashUp.review?.approvedAt && <p className="text-sm text-[#718078]">Approved{cashUp.review.selfApproved ? ' · Self-approved' : ''}</p>}
  </div>;
}
export default function CashUpReviewPage({ params }: Props) {
  return <Suspense fallback={<div role="status" className="mx-auto max-w-4xl animate-pulse space-y-6"><div className="h-20 rounded-2xl bg-[#E5EEE8]" /><div className="h-64 rounded-2xl bg-[#E5EEE8]" /></div>}>
    <ReviewContent params={params} />
  </Suspense>;
}