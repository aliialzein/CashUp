import { AddCashOutForm } from "@/components/cash-outs/AddCashOutForm";
import { mockOpenCashUp } from "@/lib/mock/cash-up";

export default function AddCashOutPage() {
    return (
        <div className="space-y-5">
            <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight">Add cash-out</h1>
                <p className="mt-1 text-sm text-muted">
                    Cash-up #{mockOpenCashUp.number} · money leaving the drawer
                </p>
            </div>

            <AddCashOutForm />
        </div>
    );
}
