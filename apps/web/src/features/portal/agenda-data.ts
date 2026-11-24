import type {
  AgendaEvent,
  AgendaHolidays,
  PersonalAgenda,
} from "@esapiens/contracts";
import { isRecord } from "@/shared/api/public-api";

export type AgendaView = "month" | "week" | "upcoming";
export type AgendaKind = AgendaEvent["kind"];
export const agendaLabels: Record<AgendaKind, string> = {
  clase: "Clases",
  tarea: "Tareas",
  evaluacion: "Evaluaciones",
  recordatorio: "Recordatorios",
  feriado: "Feriados",
};
export function dateInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
export function isCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function shiftDay(day: string, days: number) {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  const date = value.toISOString().slice(0, 10);
  return date < "2000-01-01"
    ? "2000-01-01"
    : date > "2099-12-31"
      ? "2099-12-31"
      : date;
}
export function shiftMonth(month: string, amount: number) {
  const value = new Date(`${month}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 7);
}
export function agendaRange(
  view: AgendaView,
  month: string,
  day: string,
  today: string,
) {
  let from = `${month}-01`,
    to = shiftDay(`${shiftMonth(month, 1)}-01`, -1);
  if (view === "week") {
    const date = new Date(`${day}T12:00:00Z`);
    const start = new Date(date);
    start.setUTCDate(start.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    from = start.toISOString().slice(0, 10);
    to = end.toISOString().slice(0, 10);
    if (from < "2000-01-01") from = "2000-01-01";
    if (to > "2099-12-31") to = "2099-12-31";
  } else if (view === "upcoming") {
    from = today;
    to = shiftDay(today, 29);
  }
  return { from, to, anchor: from };
}
const instant = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export function validAgendaEvent(e: unknown): e is AgendaEvent {
  return (
    isRecord(e) &&
    typeof e.id === "string" &&
    typeof e.title === "string" &&
    isCalendarDay(e.day) &&
    typeof e.kind === "string" &&
    Object.hasOwn(agendaLabels, e.kind) &&
    typeof e.done === "boolean" &&
    (e.courseId === null || typeof e.courseId === "string") &&
    (e.course === null || typeof e.course === "string") &&
    (e.occursAt === null || instant(e.occursAt)) &&
    (e.endsAt === undefined || e.endsAt === null || instant(e.endsAt)) &&
    (e.detail === undefined || typeof e.detail === "string") &&
    (e.activityId === undefined || typeof e.activityId === "string")
  );
}
export function validAgenda(v: unknown): v is PersonalAgenda {
  return (
    isRecord(v) &&
    typeof v.total === "number" &&
    Array.isArray(v.days) &&
    v.days.every(
      (d) => isRecord(d) && isCalendarDay(d.day) && typeof d.count === "number",
    ) &&
    Array.isArray(v.events) &&
    v.events.every(validAgendaEvent) &&
    Array.isArray(v.upcoming) &&
    v.upcoming.every(validAgendaEvent) &&
    Array.isArray(v.periodEvents) &&
    v.periodEvents.every(validAgendaEvent) &&
    isRecord(v.period) &&
    isCalendarDay(v.period.from) &&
    isCalendarDay(v.period.to) &&
    typeof v.period.total === "number" &&
    typeof v.period.limit === "number"
  );
}
export function validHolidays(v: unknown): v is AgendaHolidays {
  return (
    isRecord(v) &&
    typeof v.year === "number" &&
    v.country === "BO" &&
    (v.status === "available" || v.status === "unavailable") &&
    Array.isArray(v.events) &&
    v.events.every(
      (e) =>
        validAgendaEvent(e) &&
        e.kind === "feriado" &&
        e.day.startsWith(`${v.year}-`),
    ) &&
    typeof v.source === "string"
  );
}
export function eventPath(event: AgendaEvent, role: string) {
  if (!event.courseId) return null;
  const root = `/portal/${role}/cursos/${event.courseId}`;
  if (event.kind === "tarea")
    return `${root}/tareas/${event.activityId ?? event.id}`;
  if (event.kind === "evaluacion") return `${root}/evaluaciones`;
  return role === "administrador" ? `${root}/materiales` : root;
}
