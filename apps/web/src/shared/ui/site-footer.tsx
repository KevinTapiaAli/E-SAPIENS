import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { MeasurementPreference } from "@/features/analytics/measurement-preference";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="page-shell flex flex-col justify-between gap-6 py-8 sm:flex-row sm:items-center">
        <div>
          <BrandMark />
          <MeasurementPreference />
          <p className="mt-3 text-sm text-muted">
            Formación y conocimiento, a tu alcance.
          </p>
        </div>
        <nav
          aria-label="Enlaces del pie de página"
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          <Link
            href="/cursos"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-brand"
          >
            Cursos
          </Link>
          <Link
            href="/biblioteca"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-brand"
          >
            Biblioteca
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-brand"
          >
            Acceso al aula
          </Link>
        </nav>
      </div>
    </footer>
  );
}
