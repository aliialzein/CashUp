'use client';
import { useFormStatus } from 'react-dom';
import { logoutAction } from '@/app/(auth)/actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="text-sm font-medium text-[#145B37] hover:underline disabled:opacity-50">{pending ? 'Signing out…' : 'Sign out'}</button>;
}

export default function LogoutButton() {
  return <form action={logoutAction}><Submit /></form>;
}
