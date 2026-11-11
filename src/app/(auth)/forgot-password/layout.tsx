import { Suspense } from 'react';
import RequireAnonymous from '../../../components/auth/RequireAnonymous';

export default function ForgotPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Suspense fallback={null}><RequireAnonymous>{children}</RequireAnonymous></Suspense>;
}
