import Link from "next/link";
import { ActionLink } from "@/shared/ui/action-link";
import { Icon, type IconName } from "@/shared/ui/icon";
import { LearningIllustration } from "@/shared/ui/learning-illustration";
import { InstitutionalCarousel } from "@/shared/ui/institutional-carousel";

const resources: {
  href: string;
  icon: IconName;
  label: string;
  title: string;
  description: string;
  action: string;
  color: string;
}[] = [
  {
    href: "/cursos",
    icon: "book",
    label: "FORMACIÓN",
    title: "Encuentra tu próximo curso",
    description:
      "Conoce los objetivos, la duración y el temario de cada curso antes de elegir tu siguiente paso.",
    action: "Explorar cursos",
    color: "bg-brand-soft text-brand",
  },
  {
    href: "/biblioteca",
    icon: "library",
    label: "BIBLIOTECA",
    title: "Amplía lo que sabes",
    description:
      "Consulta referencias bibliográficas, autores y temas que complementan tu aprendizaje.",
    action: "Consultar biblioteca",
    color: "bg-accent-soft text-accent",
  },
];

export default function Home() {
  return (
    <main tabIndex={-1} id="main-content">
      <section className="border-b border-line bg-surface">
        <div className="page-shell grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:py-16">
          <div>
            <p className="eyebrow">Espacio de formación E-SAPIENS</p>
            <h1 className="mt-5 max-w-2xl text-[2.25rem] font-semibold leading-[1.13] tracking-[-0.04em] sm:text-5xl lg:text-[3.25rem]">
              Conocimiento para dar{" "}
              <span className="text-brand">tu próximo paso.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Explora nuestros cursos, conoce sus contenidos y encuentra
              recursos para seguir aprendiendo. Empieza por lo que te interesa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ActionLink href="/cursos">
                Explorar cursos <Icon name="arrow" />
              </ActionLink>
              <ActionLink href="/biblioteca" variant="secondary">
                Consultar biblioteca
              </ActionLink>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted">
              <Icon name="check" className="h-4 w-4 text-accent" />
              Puedes explorar sin crear una cuenta.
            </p>
          </div>
          <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-canvas px-6 py-6 sm:py-8">
            <LearningIllustration />
            <div className="relative text-center">
              <p className="text-lg font-semibold text-ink">
                Aprender empieza con curiosidad.
              </p>
              <p className="mt-2 text-sm text-muted">
                Cursos y biblioteca en un mismo lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell pt-10 sm:pt-12">
        <InstitutionalCarousel />
      </div>

      <section
        className="page-shell py-12 sm:py-16"
        aria-labelledby="resources-heading"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Explora E-SAPIENS</p>
            <h2
              id="resources-heading"
              className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              ¿Por dónde quieres empezar?
            </h2>
          </div>
          <p className="text-sm text-muted">
            Información abierta para elegir con claridad.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {resources.map((resource) => (
            <article
              key={resource.href}
              className="ui-card flex flex-col p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${resource.color}`}
                >
                  <Icon name={resource.icon} className="h-6 w-6" />
                </span>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted">
                  {resource.label}
                </p>
              </div>
              <h3 className="mt-6 text-xl font-semibold sm:text-2xl">
                {resource.title}
              </h3>
              <p className="mb-6 mt-3 max-w-lg leading-7 text-muted">
                {resource.description}
              </p>
              <Link
                href={resource.href}
                className="text-link mt-auto inline-flex min-h-11 w-fit items-center gap-2"
              >
                {resource.action}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="page-shell grid gap-10 py-12 sm:py-14 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">Un recorrido sencillo</p>
            <h2 className="mt-3 max-w-sm text-2xl font-semibold tracking-tight sm:text-3xl">
              Elige con información. Aprende con propósito.
            </h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              [
                "01",
                "Explora",
                "Encuentra un curso o una referencia sobre el tema que te interesa.",
              ],
              [
                "02",
                "Conoce los contenidos",
                "Revisa los objetivos, los temas y la información disponible.",
              ],
              [
                "03",
                "Amplía tu perspectiva",
                "Consulta la biblioteca para descubrir nuevas fuentes de aprendizaje.",
              ],
            ].map(([number, title, description]) => (
              <li key={number}>
                <span className="font-mono text-sm font-medium text-brand">
                  {number}
                </span>
                <h3 className="mt-3 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section
        className="page-shell py-8 sm:py-10"
        aria-label="Acceso de estudiantes"
      >
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-soft px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Icon name="info" className="mt-1 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold">
                Un espacio para cada perfil
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Ingresa como estudiante, docente o administrador con tu cuenta
                aprobada.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-link inline-flex min-h-11 shrink-0 items-center gap-2"
          >
            Sobre el acceso
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
