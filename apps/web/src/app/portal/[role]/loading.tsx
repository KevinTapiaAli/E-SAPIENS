import { StatePanel } from "@/shared/ui/state-panel";
export default function Loading() {
  return (
    <StatePanel
      as="h1"
      type="loading"
      title="Cargando tu portal"
      description="Estamos consultando la información de tu cuenta."
    />
  );
}
