import type { Metadata } from "next";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { SectionHeading } from "@/shared/ui/section-heading";
import { StatePanel } from "@/shared/ui/state-panel";

export const metadata: Metadata = {
  title: "Cursos",
};

const benefits = [
  {
    badge: "Catálogo",
    title: "Cursos disponibles",
    description:
      "Explora programas de formación organizados por áreas y niveles.",
  },
  {
    badge: "Flexible",
    title: "Aprende a tu ritmo",
    description:
      "Avanza por módulos y lecciones manteniendo visible tu progreso.",
  },
  {
    badge: "Acompañado",
    title: "Formación guiada",
    description:
      "Accede a contenidos, evaluaciones y sesiones dirigidas por docentes.",
  },
];

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="brand-glow border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Formación"
            title="Encuentra tu próximo curso"
            description="Explora oportunidades de aprendizaje organizadas para que puedas encontrar rápidamente la formación que necesitas."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <Card key={benefit.title} interactive className="flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={index === 0 ? "brand" : "neutral"}>
                  {benefit.badge}
                </Badge>

                <span className="text-xs font-medium text-zinc-600">
                  0{index + 1}
                </span>
              </div>

              <h2 className="mt-6 text-xl font-semibold">{benefit.title}</h2>

              <p className="mt-3 leading-7 text-zinc-400">
                {benefit.description}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <StatePanel
            title="Próximamente verás los cursos aquí"
            description="Estamos preparando el catálogo. En Sprint 1 esta sección se conectará con los cursos publicados desde PostgreSQL mediante la API de E-SAPIENS."
          />
        </div>
      </section>
    </main>
  );
}
