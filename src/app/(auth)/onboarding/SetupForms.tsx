'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBusinessAction, joinBusinessAction } from './actions';

export default function SetupForms() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function submit(form: FormData, action: typeof createBusinessAction) {
    if (pending) return;
    setPending(true); setMessage('');
    try {
      const result = await action(form);
      if (result.destination) { router.replace(result.destination); router.refresh(); }
      else setMessage(result.message ?? 'Please try again.');
    } catch { setMessage('Something went wrong. Please try again.'); }
    finally { setPending(false); }
  }
  return <div className="space-y-7">
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <form action={form => submit(form, createBusinessAction)} className="space-y-3">
      <h2 className="font-semibold">Create a business</h2>
      <label className="block text-sm">Business name<input name="name" required maxLength={120} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="isSolo" />I work on my own</label>
      <button disabled={pending} className="w-full rounded-lg bg-[#167344] p-3 font-semibold text-white disabled:opacity-50">{pending ? 'Please wait…' : 'Create business'}</button>
    </form>
    <form action={form => submit(form, joinBusinessAction)} className="space-y-3 border-t pt-5">
      <h2 className="font-semibold">Join a business</h2>
      <label className="block text-sm">Join code<input name="code" required maxLength={12} className="mt-1 w-full rounded-lg border p-3" /></label>
      <button disabled={pending} className="w-full rounded-lg border border-[#167344] p-3 font-semibold text-[#167344] disabled:opacity-50">Join business</button>
    </form>
  </div>;
}
