import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser, authDestination } from '../../modules/auth/auth.service';

export default async function RequireAnonymous({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (user) redirect(authDestination(user));
  return children;
}
