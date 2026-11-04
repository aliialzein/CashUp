import { Logo } from "@/components/ui/Logo";

const features = [
  "USD and LBP, always counted apart",
  "Cash and wallet payments kept separate",
  "Locked once the owner approves",
];

export default function AuthBrandPanel() {
  return (
    <section className="relative hidden min-h-dvh flex-col justify-between bg-[#10192D] px-10 py-10 text-white lg:flex xl:px-14">
      <Logo height={40} />

      <div className="max-w-lg">
        <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-[42px]">
          Close every day with the cash you expected.
        </h1>

        <ul className="mt-9 space-y-5">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500 text-sm text-slate-200">
                ✓
              </span>

              <span className="text-base text-slate-200">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-slate-300">
        Cash reconciliation for shops and delivery drivers
      </p>
    </section>
  );
}
