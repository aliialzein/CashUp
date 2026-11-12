import Link from 'next/link';
export default function OwnerNotFound() {
  return <div className="space-y-4 rounded-2xl border border-[#E5EEE8] bg-white p-6">
    <h1 className="text-xl font-bold text-[#145B37]">Cash-up unavailable</h1>
    <p className="text-sm text-[#718078]">This record could not be found or is not available to your account.</p>
    <Link href="/owner/cash-ups" className="text-sm font-semibold text-[#167344]">Back to cash-ups</Link>
  </div>;
}
