import { Suspense } from 'react';
import Link from 'next/link';
import { ownerCashUpPage } from '../../../queries';
import CashUpSalesList from '@/components/owner/cash-up-sales/CashUpSalesList';
import ReviewFlags from '@/components/owner/cash-up-review/ReviewFlags';

interface Props { params: Promise<{ cashUpId: string }> }
async function SalesContent({ params }: Props) {
  const cashUp = await ownerCashUpPage((await params).cashUpId);
  return <>
    <Link href={'/owner/cash-ups/' + cashUp.id + '/review'} className="text-sm text-[#167344]">← Cash-up details</Link>
    {cashUp.review ? <CashUpSalesList cashUp={cashUp} /> : <>
      <h1 className="text-2xl font-bold text-[#145B37]">Cash-up Sales</h1>
      <p className="text-sm text-[#718078]">Financial sales details are available after submission to an eligible reviewer. Requests and their decisions remain available below.</p>
      <ReviewFlags requests={cashUp.requests} />
    </>}
  </>;
}
export default function CashUpSalesPage({ params }: Props) {
  return <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <Suspense fallback={<p role="status">Loading sales…</p>}><SalesContent params={params} /></Suspense>
  </div>;
}