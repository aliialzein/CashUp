import { AddSaleForm } from "@/components/sales/AddSaleForm";
import { mockOpenCashUp } from "@/lib/mock/cash-up";

export default function AddSalePage() {
  return (
    <div className="space-y-5">

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Add sale</h1>
        <p className="mt-1 text-sm text-muted">Cash-up #{mockOpenCashUp.number}</p>
      </div>

      <AddSaleForm />
    </div>
  );
}
