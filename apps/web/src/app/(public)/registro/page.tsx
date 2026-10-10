import type { Metadata } from "next";
import { AccessForm } from "@/features/auth/access-form";

export const metadata: Metadata = { title: "Solicitar cuenta de estudiante" };
export default function RegisterPage() {
  return (
    <main id="main-content" tabIndex={-1} className="page-shell py-12 sm:py-16">
      <section className="ui-card mx-auto max-w-xl p-6 sm:p-10">
        <p className="eyebrow">Comienza tu formación</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Solicita tu cuenta
        </h1>
        <p className="mt-4 text-muted">
          La administración de E-SAPIENS revisará tus datos. Una vez aprobada tu
          cuenta, podrás ingresar como estudiante.
        </p>
        <AccessForm register />
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Utilizaremos tu nombre y correo para identificar tu cuenta y revisar
          la solicitud. El registro no realiza una compra ni te inscribe
          automáticamente en un curso.
        </p>
      </section>
    </main>
  );
}
