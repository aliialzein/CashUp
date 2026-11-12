'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { decideSaleDeletionAction, type OwnerActionResult } from '../../../app/(owner)/owner/actions';

export default function DeletionDecisionForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<OwnerActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  function decide(decision: 'APPROVE' | 'REFUSE') {
    if (locked.current) return;
    locked.current = true;
    startTransition(async () => {
      try {
        const next = await decideSaleDeletionAction(requestId, decision, reason);
        setResult(next);
        if (next.ok) router.refresh();
      } finally { locked.current = false; }
    });
  }
  return <div className="mt-4 space-y-3">
    <TextField label="Decision reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={200}
      disabled={pending} hint="3–200 characters" error={result && !result.ok ? result.fields?.reason : undefined} />
    <div className="flex flex-wrap gap-3">
      <Button loading={pending} onClick={() => decide('APPROVE')} className="bg-[#167344] hover:bg-[#145B37]">Approve deletion</Button>
      <Button disabled={pending} onClick={() => decide('REFUSE')} variant="secondary">Refuse deletion</Button>
    </div>
    {result && <p role={result.ok ? 'status' : 'alert'} className="text-sm">{result.ok ? 'Decision saved.' : `${result.message} (${result.code})`}</p>}
  </div>;
}
