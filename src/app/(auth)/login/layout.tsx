import { Suspense } from 'react';
import RequireAnonymous from '../../../components/auth/RequireAnonymous';

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Suspense fallback={null}><RequireAnonymous>{children}</RequireAnonymous></Suspense>;
}
