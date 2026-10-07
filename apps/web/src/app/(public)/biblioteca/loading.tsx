import { StatePanel } from "@/shared/ui/state-panel";
export default function Loading() {
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto max-w-5xl px-6 py-16"
    >
      <StatePanel
        as="h1"
        type="loading"
        title="Cargando biblioteca"
        description="Estamos consultando las fichas bibliográficas."
      />
    </main>
  );
}
