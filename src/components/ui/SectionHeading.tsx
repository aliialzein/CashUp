interface SectionHeadingProps {
  title: string;
  className?: string;
}

export default function SectionHeading({
  title,
  className = "",
}: SectionHeadingProps) {
  return (
    <h2
      className={`text-xs font-semibold tracking-wider text-muted ${className}`}
    >
      {title}
    </h2>
  );
}
