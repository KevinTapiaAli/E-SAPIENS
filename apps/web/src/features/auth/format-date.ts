export function formatAccountDate(
  value: string,
  timeZone = "America/La_Paz",
): string {
  try {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeZone,
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(value));
  }
}
