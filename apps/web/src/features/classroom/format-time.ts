export function formatAccessTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  try {
    return new Intl.DateTimeFormat("es-BO", { ...options, timeZone }).format(
      date,
    );
  } catch {
    return `${new Intl.DateTimeFormat("es-BO", { ...options, timeZone: "UTC" }).format(date)} UTC`;
  }
}
