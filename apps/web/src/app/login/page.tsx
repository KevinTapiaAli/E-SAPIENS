import type { Metadata } from "next";
import { Badge } from "@/shared/ui/badge";
import { ActionLink } from "@/shared/ui/action-link";
import { Icon } from "@/shared/ui/icon";
export const metadata: Metadata = { title: "Acceso de estudiantes" };
export default function LoginPage() {
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="flex flex-1 items-center justify-center px-5 py-12 sm:py-16"
    >
      <section className="ui-card w-full max-w-xl p-6 sm:p-10">
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon name="book" className="h-7 w-7" />
        </span>
        <Badge variant="warning">Próximamente</Badge>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Estamos preparando tu aula
        </h1>
        <p className="mt-4 leading-7 text-muted">
          El acceso de estudiantes todavía no está habilitado. Mientras tanto,
          puedes conocer nuestros cursos y consultar las fichas de biblioteca.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ActionLink href="/cursos">Explorar cursos</ActionLink>
          <ActionLink href="/biblioteca" variant="secondary">
            Ver biblioteca
          </ActionLink>
        </div>
      </section>
    </main>
  );
}
