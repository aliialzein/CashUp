import type { OwnerCashUpDetailDto } from '../../../modules/cash-ups/cash-ups.types';
import { ownerDate } from '../owner-format';

interface Props {
  cashUp: OwnerCashUpDetailDto;
}

export default function ReviewHeader({ cashUp }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#145B37]">
          Cash-up #{cashUp.number}: {cashUp.staffName}
        </h1>

        <p className="mt-1 text-sm text-[#718078]">
          Opened {ownerDate(cashUp.openedAt)}
        </p>

        {cashUp.review?.closedAt && (
          <p className="text-sm text-[#718078]">
            Closed {ownerDate(cashUp.review.closedAt)}
          </p>
        )}
      </div>

      <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        {cashUp.status}
      </span>
    </div>
  );
}
