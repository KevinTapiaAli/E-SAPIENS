import type { Metadata } from "next";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { SectionHeading } from "@/shared/ui/section-heading";
import { StatePanel } from "@/shared/ui/state-panel";

export const metadata: Metadata = {
  title: "Biblioteca",
};

export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="brand-glow border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Biblioteca"
            title="Tu material académico, fácil de encontrar"
            description="Consulta libros, documentos y referencias organizados para complementar tu aprendizaje."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <Card interactive>
            <Badge variant="brand">Recursos</Badge>

            <h2 className="mt-6 text-2xl font-semibold">Libros y documentos</h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Material académico organizado por curso, tema y área de formación.
            </p>
          </Card>

          <Card interactive>
            <Badge>Referencias</Badge>

            <h2 className="mt-6 text-2xl font-semibold">
              Bibliografía recomendada
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Encuentra fácilmente las fuentes sugeridas por docentes y
              capacitadores.
            </p>
          </Card>
        </div>

        <div className="mt-12">
          <StatePanel
            title="La biblioteca se está preparando"
            description="Cuando los recursos académicos sean publicados podrás encontrarlos aquí organizados por curso, tema y categoría."
          />
        </div>
      </section>
    </main>
  );
}
