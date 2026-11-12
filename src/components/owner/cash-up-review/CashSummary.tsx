import type { CashUpReviewDto } from '../../../modules/cash-ups/cash-ups.types';
import { ownerLedger, ownerMoney } from '../owner-format';

export default function CashSummary({ cashUp }: { cashUp: CashUpReviewDto }) {
  const ledger = ownerLedger(cashUp);
  const sections = [
    { title: 'Cash Summary', description: 'Saved reconciliation snapshot — historical expected, counted and gap', rows: [
      { label: 'Saved expected', usd: cashUp.expectedUsd, lbp: cashUp.expectedLbp },
      { label: 'Saved counted', usd: cashUp.countedUsd, lbp: cashUp.countedLbp },
      { label: 'Saved gap', usd: cashUp.gapUsd, lbp: cashUp.gapLbp },
    ] },
    { title: 'Calculated cash ledger', description: 'Current delivered sales and active cash-outs; separate from the saved snapshot', rows: [
      { label: 'Float', usd: ledger.floatUsd, lbp: ledger.floatLbp },
      { label: 'Cash received', usd: ledger.receivedUsd, lbp: ledger.receivedLbp },
      { label: 'Change given', usd: ledger.changeGivenUsd, lbp: ledger.changeGivenLbp },
      { label: 'Cash-outs', usd: ledger.cashOutsUsd, lbp: ledger.cashOutsLbp },
      { label: 'Calculated expected', usd: ledger.expectedUsd, lbp: ledger.expectedLbp },
      { label: 'Whish collected', usd: cashUp.walletTotals.WHISH.USD, lbp: cashUp.walletTotals.WHISH.LBP },
      { label: 'OMT collected', usd: cashUp.walletTotals.OMT.USD, lbp: cashUp.walletTotals.OMT.LBP },
    ] },
  ];
  return <>{sections.map(section => <section key={section.title} className="overflow-hidden rounded-2xl border border-[#E2EBE5] bg-white shadow-sm">
    <div className="border-b border-[#E5EEE8] bg-[#F7FAF8] px-5 py-4">
      <h2 className="font-semibold text-[#145B37]">{section.title}</h2>
      <p className="mt-1 text-xs text-[#718078]">{section.description}</p>
    </div>
    <div className="overflow-x-auto p-5"><table className="w-full min-w-[320px] text-sm">
      <thead><tr className="text-right text-xs font-semibold uppercase tracking-wide text-[#718078]">
        <th className="pb-4 text-left">Details</th><th className="pb-4">USD</th><th className="pb-4">LBP</th>
      </tr></thead>
      <tbody>{section.rows.map(row => <tr key={row.label} className="border-t border-[#F1F5F2]">
        <td className="py-3 text-left text-[#64756A]">{row.label}</td>
        <td className="py-3 text-right tabular-nums text-[#263B30]">{ownerMoney(row.usd)}</td>
        <td className="py-3 text-right tabular-nums text-[#263B30]">{ownerMoney(row.lbp)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>)}</>;
}