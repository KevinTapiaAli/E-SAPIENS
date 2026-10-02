import Link from "next/link";
import { Icon } from "./icon";

type BrandMarkProps = { compact?: boolean };
export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="Ir al inicio de E-SAPIENS"
      className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-institutional text-on-institutional">
        <Icon name="book" className="h-6 w-6" />
      </span>
      {!compact && (
        <span className="text-[1.125rem] font-bold tracking-[-0.025em] text-ink">
          E-SAPIENS
        </span>
      )}
    </Link>
  );
}
