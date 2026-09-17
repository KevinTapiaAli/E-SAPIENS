import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="Ir al inicio de E-SAPIENS"
      className="group inline-flex items-center gap-3"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
        <span className="absolute h-3 w-3 rounded-full bg-violet-400 blur-sm" />

        <span className="relative h-2.5 w-2.5 rounded-full bg-violet-300" />
      </span>

      {!compact && (
        <span className="text-lg font-bold tracking-tight text-white">
          E-SAPIENS
        </span>
      )}
    </Link>
  );
}
