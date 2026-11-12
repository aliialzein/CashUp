'use client';
import { Button } from '@/components/ui/Button';
export default function OwnerError({ reset }: { reset: () => void }) {
  return <div className="space-y-4 rounded-2xl border border-[#E5EEE8] bg-white p-6">
    <h1 className="text-xl font-bold text-[#145B37]">Unable to load owner data</h1>
    <p role="alert" className="text-sm text-[#718078]">Please try again. If the problem continues, contact your business administrator.</p>
    <Button onClick={reset} className="bg-[#167344] hover:bg-[#145B37]">Try again</Button>
  </div>;
}
