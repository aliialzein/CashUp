import type { ReactNode } from "react";
import AuthBrandPanel from "./AuthBrandPanel";
import { Logo } from "@/components/ui/Logo";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <main className="grid min-h-dvh bg-[#F7F8FA] lg:grid-cols-2">
      <AuthBrandPanel />

      <section className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-8">
        {/* Mobile branding */}
        <div className="mb-8 lg:hidden">
          <Logo height={42} />
        </div>

        <div className="w-full max-w-130">{children}</div>
      </section>
    </main>
  );
}
