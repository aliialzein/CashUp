import { Suspense } from "react";
import { notFound } from "next/navigation";

import { mockCashUps } from "@/data/mock/cash-ups";
import { CashUpStatus, RequestStatus } from "@/components/owner/cash-up-view-models";

import ReviewHeader from "@/components/owner/cash-up-review/ReviewHeader";
import CashSummary from "@/components/owner/cash-up-review/CashSummary";
import ReviewFlags from "@/components/owner/cash-up-review/ReviewFlags";
import ReviewActions from "@/components/owner/cash-up-review/ReviewActions";
import SalesOverview from "@/components/owner/cash-up-review/SalesOverview";

interface Props {
  params: Promise<{ cashUpId: string }>;
}

function ReviewSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-[#E5EEE8]" />
      <div className="h-64 rounded-2xl bg-[#E5EEE8]" />
      <div className="h-40 rounded-2xl bg-[#E5EEE8]" />
    </div>
  );
}

async function ReviewContent({ params }: Props) {
  const { cashUpId } = await params;

  const cashUp = mockCashUps.find((item) => item.id === cashUpId);

  if (!cashUp || cashUp.status !== CashUpStatus.SUBMITTED) {
    notFound();
  }

  const pendingRequests = cashUp.requests.filter(
    (request) => request.status === RequestStatus.AWAITING_OWNER,
  ).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      <ReviewHeader cashUp={cashUp} />
      <CashSummary cashUp={cashUp} />
      <SalesOverview cashUp={cashUp} />
      <ReviewFlags requests={cashUp.requests} />
      <ReviewActions pendingRequests={pendingRequests} />
    </div>
  );
}

export default function CashUpReviewPage({ params }: Props) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewContent params={params} />
    </Suspense>
  );
}
