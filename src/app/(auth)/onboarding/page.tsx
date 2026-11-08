import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, authDestination } from '../../../modules/auth/auth.service';
import AuthLayout from '../../../components/auth/AuthLayout';
import AuthCard from '../../../components/auth/AuthCard';
import LogoutButton from '../../../components/auth/LogoutButton';
import SetupForms from './SetupForms';

async function Content() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (authDestination(user) === '/owner') redirect('/owner');
  return <AuthLayout><AuthCard title="Set up your account" description={`Welcome, ${user.fullName}.`}>
    {!user.membership ? <SetupForms /> : <p role="status" className="text-sm text-slate-600">{user.membership.status === 'INACTIVE' ? 'Your membership is inactive. Please contact your business owner.' : 'You have joined your business. Your driver or manager workspace is not connected yet.'}</p>}
    <div className="mt-6 text-center"><LogoutButton /></div>
  </AuthCard></AuthLayout>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<div className="p-8">Loading your account…</div>}><Content /></Suspense>;
}
