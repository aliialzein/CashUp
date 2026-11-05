import type { CashUpCardData } from "@/types/cash-up";

interface Props {
  cashUp: CashUpCardData;
}

export default function ReviewHeader({ cashUp }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#145B37]">
          Review: {cashUp.membership.user.fullName}
        </h1>

        <p className="mt-1 text-sm text-[#718078]">
          Opened {cashUp.openedAt.toLocaleString()}
        </p>

        {cashUp.closedAt && (
          <p className="text-sm text-[#718078]">
            Closed {cashUp.closedAt.toLocaleString()}
          </p>
        )}
      </div>

      <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Submitted
      </span>
    </div>
  );
}
