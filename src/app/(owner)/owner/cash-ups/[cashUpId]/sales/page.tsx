import { Suspense } from "react";
import { notFound } from "next/navigation";

import { mockCashUps } from "@/data/mock/cash-ups";
import { CashUpStatus } from "@/types/cash-up";

import CashUpSalesList from "@/components/owner/cash-up-sales/CashUpSalesList";

interface Props {
  params: Promise<{ cashUpId: string }>;
}

function SalesSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-20 rounded-xl bg-[#E5EEE8]" />
      <div className="h-40 rounded-xl bg-[#E5EEE8]" />
      <div className="h-40 rounded-xl bg-[#E5EEE8]" />
    </div>
  );
}

async function SalesContent({ params }: Props) {
  const { cashUpId } = await params;

  const cashUp = mockCashUps.find((item) => item.id === cashUpId);

  if (!cashUp || cashUp.status !== CashUpStatus.SUBMITTED) {
    notFound();
  }

  return (
    <CashUpSalesList
      sales={cashUp.sales}
      requests={cashUp.requests}
      employeeName={cashUp.membership.user.fullName}
    />
  );
}

export default function CashUpSalesPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Suspense fallback={<SalesSkeleton />}>
        <SalesContent params={params} />
      </Suspense>
    </main>
  );
}
