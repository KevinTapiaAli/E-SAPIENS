import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AgendaEvent, AgendaHolidays } from '@esapiens/contracts';

const source = 'https://nagerholidays.com/api/v4/Holidays/BO';
function holidayEvents(value: unknown, year: number): AgendaEvent[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 366)
    return null;
  const events = new Map<string, AgendaEvent>();
  for (const item of value as unknown[]) {
    if (!item || typeof item !== 'object') return null;
    const h = item as Record<string, unknown>;
    if (
      typeof h.date !== 'string' ||
      !new RegExp(`^${year}-\\d{2}-\\d{2}$`).test(h.date) ||
      h.countryCode !== 'BO' ||
      typeof h.name !== 'string' ||
      h.name.trim().length < 1 ||
      h.name.length > 180 ||
      typeof h.nationalHoliday !== 'boolean' ||
      !Array.isArray(h.holidayTypes) ||
      h.holidayTypes.length === 0 ||
      !h.holidayTypes.every(
        (t: unknown) =>
          typeof t === 'string' &&
          [
            'Public',
            'Bank',
            'School',
            'Authorities',
            'Optional',
            'Observance',
          ].includes(t),
      )
    )
      return null;
    const date = new Date(`${h.date}T12:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== h.date
    )
      return null;
    // Without a user subdivision, regional observances cannot be presented as
    // national public holidays. Names are kept exactly as supplied by Nager.Date.
    if (!h.nationalHoliday || !h.holidayTypes.includes('Public')) continue;
    const id = `BO-${h.date}-${createHash('sha256').update(h.name.trim()).digest('hex').slice(0, 16)}`;
    events.set(id, {
      id,
      title: h.name.trim(),
      day: h.date,
      kind: 'feriado',
      done: false,
      courseId: null,
      course: null,
      occursAt: null,
      detail:
        'Feriado nacional informado por Nager.Date. No modifica clases ni fechas de entrega.',
    });
  }
  return [...events.values()].sort(
    (a, b) => a.day.localeCompare(b.day) || a.title.localeCompare(b.title),
  );
}

@Injectable()
export class AgendaHolidaysService {
  private readonly cache = new Map<
    number,
    { until: number; value: AgendaHolidays }
  >();
  private readonly inflight = new Map<number, Promise<AgendaHolidays>>();
  forYear(year: number): Promise<AgendaHolidays> {
    const saved = this.cache.get(year);
    if (saved && saved.until > Date.now()) return Promise.resolve(saved.value);
    const existing = this.inflight.get(year);
    if (existing) return existing;
    const request = this.load(year).finally(() => this.inflight.delete(year));
    this.inflight.set(year, request);
    return request;
  }
  private async load(year: number): Promise<AgendaHolidays> {
    const result: AgendaHolidays = {
      year,
      country: 'BO',
      status: 'unavailable',
      events: [],
      source: `${source}/${year}`,
    };
    if (!Number.isInteger(year) || year < 2000 || year > 2099) return result;
    try {
      const response = await fetch(result.source, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(2500),
      });
      if (response.ok) {
        const text = await response.text();
        if (text.length <= 131072) {
          const events = holidayEvents(JSON.parse(text) as unknown, year);
          if (events) {
            result.events = events;
            result.status = 'available';
          }
        }
      }
    } catch {
      // An external provider must never prevent reading the academic agenda.
    }
    this.cache.set(year, {
      until: Date.now() + (result.status === 'available' ? 86400000 : 300000),
      value: result,
    });
    return result;
  }
}
