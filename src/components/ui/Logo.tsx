import Image from "next/image";

type LogoProps = {
  /** Rendered height in px. Width follows the logo's aspect ratio. */
  height?: number;
  className?: string;
};

// public/cashup-logo.png is cropped to its content (1087 x 323, ratio ~ 3.37 : 1).
const RATIO = 1087 / 323;

export function Logo({ height = 56, className = "" }: LogoProps) {
  return (
    <Image
      src="/cashup-logo.png"
      alt="CashUp"
      width={Math.round(height * RATIO)}
      height={height}
      priority
      className={className}
    />
  );
}
