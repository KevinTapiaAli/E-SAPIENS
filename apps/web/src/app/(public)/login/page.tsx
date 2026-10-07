import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessForm } from "@/features/auth/access-form";
import { isSessionUser, readIdentity } from "@/features/auth/server";
import { Icon } from "@/shared/ui/icon";

export const metadata: Metadata = { title: "Iniciar sesión" };
export default async function LoginPage() {
  const session = await readIdentity("me", isSessionUser);
  if (isSessionUser(session.data)) redirect("/portal");
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="page-shell grid items-center gap-7 py-8 sm:py-16 lg:grid-cols-2 lg:gap-20"
    >
      <section>
        <p className="eyebrow">Tu espacio en E-SAPIENS</p>
        <h1 className="mt-4 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Bienvenido a tu comunidad de aprendizaje.
        </h1>
        <p className="mt-5 max-w-lg text-lg text-muted">
          Un solo acceso para estudiantes, docentes y administración. Tu cuenta
          te llevará automáticamente al espacio que te corresponde.
        </p>
        <ul className="mt-8 hidden space-y-4 lg:block">
          {[
            {
              title: "Estudiantes",
              text: "Consulta tus inscripciones y organiza tu formación.",
              icon: "book" as const,
            },
            {
              title: "Docentes",
              text: "Acompaña a tus estudiantes y consulta su avance por materia.",
              icon: "monitor" as const,
            },
            {
              title: "Administración",
              text: "Gestiona matrículas, accesos y el seguimiento académico.",
              icon: "check" as const,
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon name={item.icon} />
              </span>
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section
        className="ui-card w-full max-w-xl justify-self-center p-6 sm:p-10"
        aria-labelledby="login-title"
      >
        <h2 id="login-title" className="text-2xl font-semibold">
          Iniciar sesión
        </h2>
        <p className="mt-2 text-muted">
          Usa el correo y la contraseña de tu cuenta aprobada.
        </p>
        <AccessForm />
        <div className="mt-6 border-t border-line pt-5 text-sm text-muted">
          <p>
            Si tu cuenta aún no fue aprobada o necesitas ayuda con tu
            contraseña, contacta con la administración de E-SAPIENS.
          </p>
          <Link
            href="/cursos"
            className="text-link mt-3 inline-flex min-h-11 items-center"
          >
            Continuar explorando los cursos
          </Link>
        </div>
      </section>
    </main>
  );
}
