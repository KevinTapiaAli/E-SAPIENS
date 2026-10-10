import { StatePanel } from "@/shared/ui/state-panel";
export default function Loading() {
  return (
    <main id="main-content" tabIndex={-1} className="page-shell py-12">
      <StatePanel
        as="h1"
        type="loading"
        title="Preparando tu espacio"
        description="Estamos consultando tu cuenta y sus opciones disponibles."
      />
    </main>
  );
}
