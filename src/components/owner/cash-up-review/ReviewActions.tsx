'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { approveCashUpAction, returnCashUpAction, type OwnerActionResult } from '../../../app/(owner)/owner/actions';

export default function ReviewActions({ cashUpId, pendingRequests }: { cashUpId: string; pendingRequests: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<OwnerActionResult | null>(null);
  function decide(approve: boolean) {
    if (locked.current) return;
    if (!approve && !returning) { setReturning(true); return; }
    locked.current = true;
    startTransition(async () => {
      try {
        const next = approve ? await approveCashUpAction(cashUpId) : await returnCashUpAction(cashUpId, reason);
        setResult(next);
        if (next.ok) router.refresh();
      } finally { locked.current = false; }
    });
  }
  return <section className="space-y-4">
    {returning && <TextField label="Return reason" value={reason} onChange={event => setReason(event.target.value)}
      disabled={pending} maxLength={200} error={result && !result.ok ? result.fields?.reason : undefined} hint="3–200 characters" />}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button loading={pending} onClick={() => decide(true)} className="h-12 bg-[#167344] hover:bg-[#145B37]">Approve</Button>
      <Button disabled={pending} onClick={() => decide(false)} variant="secondary" className="h-12 border-[#167344] text-[#167344] hover:bg-[#EAF5ED]">Return with reason</Button>
    </div>
    {result && <p role={result.ok ? 'status' : 'alert'} className="text-sm text-[#64756A]">{result.ok ? 'Decision saved.' : `${result.message} (${result.code})`}</p>}
    <p className="text-sm text-[#718078]">{pendingRequests === 0 ? 'All requests have been reviewed.' : `${pendingRequests} requests waiting for a decision.`}</p>
  </section>;
}
