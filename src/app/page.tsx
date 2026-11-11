import { Suspense } from 'react';
import LoginPage from "@/app/(auth)/login/page";
import { redirect } from 'next/navigation';
import { authDestination, getCurrentUser } from '../modules/auth/auth.service';

async function HomeContent() {
  const user = await getCurrentUser();
  if (user) redirect(authDestination(user));
  return <LoginPage />;
}

export default function Home() {
  return <Suspense fallback={null}><HomeContent /></Suspense>;
}
