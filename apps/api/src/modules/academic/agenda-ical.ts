import { createHash } from 'node:crypto';
import type { AgendaEvent, WorkspaceRole } from '@esapiens/contracts';

const labels = {
  clase: 'Clase',
  tarea: 'Plazo de tarea',
  evaluacion: 'Evaluación',
  recordatorio: 'Recordatorio',
  feriado: 'Feriado informativo',
};
function text(value: string) {
  let clean = '';
  for (const character of value) {
    if (
      character === '\r' ||
      character === '\n' ||
      character.charCodeAt(0) >= 32
    )
      clean += character;
  }
  return clean
    .replaceAll('\\', '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}
function fold(line: string) {
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character, 'utf8');
    if (bytes + size > 75) {
      lines.push(current);
      current = ' ';
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  lines.push(current);
  return lines.join('\r\n');
}
const instant = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
export function agendaEventPath(event: AgendaEvent, role: WorkspaceRole) {
  if (!event.courseId) return null;
  const base = `/portal/${role}/cursos/${event.courseId}`;
  if (event.kind === 'tarea')
    return `${base}/tareas/${event.activityId ?? event.id}`;
  if (event.kind === 'evaluacion') return `${base}/evaluaciones`;
  return role === 'administrador' ? `${base}/materiales` : base;
}
export function agendaIcal(
  events: AgendaEvent[],
  userId: string,
  role: WorkspaceRole,
  timeZone: string,
  origin: string,
  now = new Date(),
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//E-SAPIENS//Agenda academica//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${text('Agenda académica E-SAPIENS')}`,
    `X-WR-TIMEZONE:${text(timeZone)}`,
  ];
  const seen = new Set<string>();
  for (const e of events) {
    const key = `${e.kind}:${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const uid = createHash('sha256').update(`${userId}:${key}`).digest('hex');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}@esapiens.local`,
      `DTSTAMP:${instant(now.toISOString())}`,
    );
    if (e.occursAt) {
      lines.push(`DTSTART:${instant(e.occursAt)}`);
      if (e.endsAt) lines.push(`DTEND:${instant(e.endsAt)}`);
    } else {
      const next = new Date(`${e.day}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(
        `DTSTART;VALUE=DATE:${e.day.replaceAll('-', '')}`,
        `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replaceAll('-', '')}`,
      );
    }
    lines.push(
      `SUMMARY:${text(e.title)}`,
      `DESCRIPTION:${text([labels[e.kind], e.course, e.detail, e.done ? 'Completado' : null].filter(Boolean).join('\n'))}`,
      'STATUS:CONFIRMED',
      `TRANSP:${e.kind === 'clase' ? 'OPAQUE' : 'TRANSPARENT'}`,
    );
    const path = agendaEventPath(e, role);
    if (path) lines.push(`URL:${new URL(path, origin).toString()}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
