import type { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

export default function AuthCard({ title, description, children }: Props) {
  return (
    <div className="rounded-2xl border border-[#E1E5EB] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-[#10192D] sm:text-[28px]">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#667085] sm:text-base">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}
