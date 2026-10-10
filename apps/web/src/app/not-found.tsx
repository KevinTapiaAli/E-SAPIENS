import Link from "next/link";
export default function NotFound() {
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto max-w-3xl px-6 py-24 text-center"
    >
      <p className="eyebrow">Página no disponible</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        No encontramos lo que buscas
      </h1>
      <p className="mt-5 leading-7 text-muted">
        El enlace puede haber cambiado o el contenido todavía no está publicado.
      </p>
      <Link href="/cursos" className="button button-primary mt-8">
        Explorar cursos
      </Link>
    </main>
  );
}
