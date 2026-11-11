"use client";

import { useMemo, useState } from "react";

import {
  Currency,
  PaymentMethod,
  RequestStatus,
  RequestType,
  SaleStatus,
  type RequestData,
  type SaleData,
} from "@/components/owner/cash-up-view-models";

interface Props {
  sales: SaleData[];
  requests: RequestData[];
  employeeName: string;
}

type SalesFilter = "ALL" | "AWAITING_OWNER";

const money = (amount: number, currency: Currency) =>
  `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

const saleStatusLabels: Record<SaleStatus, string> = {
  TO_DELIVER: "To deliver",
  DELIVERED: "Delivered",
  DELETED: "Deleted",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  WHISH: "Whish",
  OMT: "OMT",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CashUpSalesList({
  sales,
  requests,
  employeeName,
}: Props) {
  const [filter, setFilter] = useState<SalesFilter>("ALL");
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Get pending DELETE_SALE requests and their associated sales.
  const pendingSaleRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.type === RequestType.DELETE_SALE &&
          request.status === RequestStatus.AWAITING_OWNER &&
          request.saleId !== null,
      ),
    [requests],
  );

  const pendingSaleIds = useMemo(
    () => new Set(pendingSaleRequests.map((request) => request.saleId)),
    [pendingSaleRequests],
  );

  const filteredSales = useMemo(
    () =>
      filter === "AWAITING_OWNER"
        ? sales.filter((sale) => pendingSaleIds.has(sale.id))
        : sales,
    [filter, sales, pendingSaleIds],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-[#718078]">Cash-up / Sales</p>

        <h1 className="mt-1 text-2xl font-bold text-[#145B37]">
          Cash-up Sales
        </h1>

        <p className="mt-1 text-sm text-[#718078]">
          Sales recorded by {employeeName}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            filter === "ALL"
              ? "bg-[#167344] text-white"
              : "border border-[#DCE9E0] bg-white text-[#64756A] hover:bg-[#F7FAF8]"
          }`}
        >
          All Sales ({sales.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("AWAITING_OWNER")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            filter === "AWAITING_OWNER"
              ? "bg-amber-600 text-white"
              : "border border-[#DCE9E0] bg-white text-[#64756A] hover:bg-[#F7FAF8]"
          }`}
        >
          Awaiting Owner ({pendingSaleIds.size})
        </button>
      </div>

      {/* Sales */}
      {filteredSales.length === 0 ? (
        <div className="rounded-2xl border border-[#E2EBE5] bg-white p-8 text-center">
          <p className="font-medium text-[#145B37]">No sales found</p>
          <p className="mt-1 text-sm text-[#718078]">
            There are no sales in this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id;

            const saleRequests = requests.filter(
              (request) => request.saleId === sale.id,
            );

            const pendingRequest = saleRequests.find(
              (request) =>
                request.type === RequestType.DELETE_SALE &&
                request.status === RequestStatus.AWAITING_OWNER,
            );

            return (
              <article
                key={sale.id}
                className="overflow-hidden rounded-2xl border border-[#E2EBE5] bg-white shadow-sm"
              >
                {/* Sale summary */}
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#145B37]">
                        Sale #{sale.saleNumber}
                      </h2>

                      <span className="rounded-full bg-[#EAF5ED] px-3 py-1 text-xs font-medium text-[#167344]">
                        {saleStatusLabels[sale.status]}
                      </span>

                      {pendingRequest && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          Awaiting Owner
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#718078]">
                      {formatDate(sale.createdAt)}
                    </p>

                    <p className="text-sm text-[#64756A]">
                      {sale.method === null ? 'Not collected' : paymentMethodLabels[sale.method]}
                      {" · "}
                      {sale.currency}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <p className="font-bold tabular-nums text-[#145B37]">
                      {sale.totalCollected === null ? 'Not collected' : money(sale.totalCollected, sale.currency)}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSaleId(isExpanded ? null : sale.id)
                      }
                      aria-expanded={isExpanded}
                      className="rounded-lg border border-[#DCE9E0] px-3 py-2 text-sm font-medium text-[#167344] transition hover:bg-[#F7FAF8]"
                    >
                      {isExpanded ? "Hide details" : "View details"}
                    </button>
                  </div>
                </div>

                {/* Sale details */}
                {isExpanded && (
                  <div className="space-y-5 border-t border-[#E5EEE8] bg-[#FAFCFA] p-4 sm:p-5">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-[#145B37]">
                        Sale Details
                      </h3>

                      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                        <Detail
                          label="Business Amount"
                          value={money(sale.businessAmount, sale.currency)}
                        />

                        <Detail
                          label="Delivery Fee"
                          value={money(sale.deliveryFee, sale.currency)}
                        />

                        <Detail
                          label="Tip"
                          value={
                            sale.tip === null
                              ? "—"
                              : money(sale.tip, sale.currency)
                          }
                        />

                        <Detail
                          label="Discount"
                          value={
                            sale.discount === null
                              ? "—"
                              : money(sale.discount, sale.currency)
                          }
                        />

                        <Detail
                          label="Change Given"
                          value={
                            sale.changeGiven === null
                              ? "—"
                              : money(
                                  sale.changeGiven,
                                  sale.changeCurrency ?? sale.currency,
                                )
                          }
                        />

                        <Detail
                          label="Client Number"
                          value={sale.clientNumber ?? "—"}
                        />

                        <Detail
                          label="Created At"
                          value={formatDate(sale.createdAt)}
                        />

                        <Detail
                          label="Delivered At"
                          value={
                            sale.deliveredAt
                              ? formatDate(sale.deliveredAt)
                              : "Not delivered"
                          }
                        />

                        <Detail
                          label="Payment Method"
                          value={sale.method === null ? 'Not collected' : paymentMethodLabels[sale.method]}
                        />
                      </div>

                      {sale.note && (
                        <div className="mt-4">
                          <Detail label="Note" value={sale.note} />
                        </div>
                      )}
                    </div>

                    {/* Request information */}
                    {saleRequests.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-[#145B37]">
                          Related Requests
                        </h3>

                        {saleRequests.map((request) => (
                          <div
                            key={request.id}
                            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-amber-900">
                                Delete Sale Request
                              </p>

                              <span className="text-xs font-medium text-amber-800">
                                {request.status === RequestStatus.AWAITING_OWNER
                                  ? "Awaiting your review"
                                  : request.status}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-amber-900">
                              {request.reason}
                            </p>

                            <p className="mt-2 text-xs text-amber-800">
                              Requested by {request.requestedBy.user.fullName}
                              {" · "}
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Edit history */}
                    {sale.edits.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-sm font-semibold text-[#145B37]">
                          Edit History
                        </h3>

                        <div className="space-y-2">
                          {sale.edits.map((edit) => (
                            <div
                              key={edit.id}
                              className="rounded-xl bg-white p-3 text-sm"
                            >
                              <p className="font-medium text-[#263B30]">
                                {edit.field}
                              </p>

                              <p className="mt-1 text-xs text-[#718078]">
                                {edit.oldValue ?? "—"} → {edit.newValue ?? "—"}
                              </p>

                              <p className="mt-1 text-xs text-[#718078]">
                                Edited by {edit.editedBy.fullName}
                                {" · "}
                                {formatDate(edit.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sale.cancelReason && (
                      <Detail label="Cancel Reason" value={sale.cancelReason} />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#718078]">{label}</p>
      <p className="mt-1 wrap-break-word font-medium text-[#263B30]">{value}</p>
    </div>
  );
}
