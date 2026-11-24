import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type {
  AgendaEvent,
  PersonalAgenda,
  SessionUser,
} from '@esapiens/contracts';
import { AgendaController } from './agenda.controller';
import { AgendaQuery } from './agenda.dto';
import { agendaPeriod, calendarDay, AgendaService } from './agenda.service';
import { AgendaHolidaysService } from './agenda-holidays.service';
import { agendaIcal } from './agenda-ical';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';

const query = (day: string, view?: AgendaQuery['view']) =>
  Object.assign(new AgendaQuery(), {
    day,
    month: day.slice(0, 7),
    view,
    role: 'estudiante',
  });
describe('Agenda: fechas y períodos', () => {
  it.each([
    '2026-02-29',
    '2024-02-30',
    '2026-04-31',
    '1999-12-31',
    '2100-01-01',
  ])('rechaza fecha imposible o fuera de rango %s', (day) => {
    expect(() => calendarDay(day)).toThrow(BadRequestException);
  });
  it('conserva febrero bisiesto y el cambio de año', () => {
    expect(
      agendaPeriod(query('2024-02-29', 'month'), 'America/La_Paz'),
    ).toEqual({ from: '2024-02-01', until: '2024-03-01', to: '2024-02-29' });
    expect(agendaPeriod(query('2026-12-31', 'week'), 'America/La_Paz')).toEqual(
      { from: '2026-12-28', until: '2027-01-04', to: '2027-01-03' },
    );
  });
  it('acota las semanas en ambos extremos del rango existente', () => {
    expect(agendaPeriod(query('2000-01-01', 'week'), 'UTC').from).toBe(
      '2000-01-01',
    );
    expect(agendaPeriod(query('2099-12-31', 'week'), 'UTC').until).toBe(
      '2100-01-01',
    );
  });
  it('calcula hoy en la zona del usuario y no en la del servidor', () => {
    const now = new Date('2026-12-31T23:30:00Z');
    expect(
      agendaPeriod(query('2026-12-31', 'upcoming'), 'Pacific/Kiritimati', now)
        .from,
    ).toBe('2027-01-01');
    expect(
      agendaPeriod(query('2026-12-31', 'upcoming'), 'America/La_Paz', now).from,
    ).toBe('2026-12-31');
  });
  it('rechaza un día que no corresponde al mes antes de consultar SQL', async () => {
    const database = { query: jest.fn() };
    const service = new AgendaService(database as unknown as DatabaseService);
    await expect(
      service.list(
        { timeZone: 'UTC' } as SessionUser,
        Object.assign(new AgendaQuery(), query('2026-11-30'), {
          month: '2026-12',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.query).not.toHaveBeenCalled();
  });
});

describe('Agenda: proveedor público aislado del calendario académico', () => {
  const holiday = {
    date: '2026-01-01',
    name: "New Year's Day",
    countryCode: 'BO',
    nationalHoliday: true,
    holidayTypes: ['Public'],
  };
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());
  it('valida BO, conserva eventos simultáneos diferentes y deduplica idénticos', async () => {
    fetchMock.mockResolvedValue(
      new globalThis.Response(
        JSON.stringify([
          holiday,
          holiday,
          { ...holiday, name: 'Another day' },
          { ...holiday, name: 'Regional', nationalHoliday: false },
        ]),
      ),
    );
    const service = new AgendaHolidaysService();
    const result = await service.forYear(2026);
    expect(result.status).toBe('available');
    expect(result.events).toHaveLength(2);
    expect(
      result.events.every((e) => e.kind === 'feriado' && e.courseId === null),
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://nagerholidays.com/api/v4/Holidays/BO/2026',
      expect.objectContaining({
        redirect: 'error',
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it('comparte la consulta en curso y guarda exclusivamente datos públicos por año', async () => {
    fetchMock.mockResolvedValue(
      new globalThis.Response(JSON.stringify([holiday])),
    );
    const service = new AgendaHolidaysService();
    const [first, second] = await Promise.all([
      service.forYear(2026),
      service.forYear(2026),
    ]);
    expect(first).toEqual(second);
    expect(await service.forYear(2026)).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(
    [
      [],
      [{}],
      [{ ...holiday, countryCode: 'AR' }],
      [{ ...holiday, date: '2026-02-30' }],
      [{ ...holiday, date: '2027-01-01' }],
      [{ ...holiday, holidayTypes: [] }],
      [{ ...holiday, name: '' }],
    ].map((value) => ({ value })),
  )('omite toda respuesta incompleta o inválida %#', async ({ value }) => {
    fetchMock.mockResolvedValue(new globalThis.Response(JSON.stringify(value)));
    expect(await new AgendaHolidaysService().forYear(2026)).toMatchObject({
      status: 'unavailable',
      events: [],
    });
  });
  it.each([404, 429, 503])(
    'devuelve solo información de indisponibilidad ante HTTP %s',
    async (status) => {
      fetchMock.mockResolvedValue(new globalThis.Response('', { status }));
      expect(await new AgendaHolidaysService().forYear(2026)).toMatchObject({
        status: 'unavailable',
        events: [],
      });
    },
  );
  it('tolera timeout y conserva la respuesta negativa solo cinco minutos', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
    fetchMock.mockRejectedValue(new DOMException('Timeout', 'TimeoutError'));
    const service = new AgendaHolidaysService();
    await service.forYear(2026);
    await service.forYear(2026);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(302000);
    await service.forYear(2026);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Agenda: sesión, rol y exportación', () => {
  const student = {
    id: '11111111-1111-4111-8111-111111111111',
    roles: ['estudiante'],
    permissions: ['classroom.study'],
    timeZone: 'America/La_Paz',
  } as SessionUser;
  const request = {} as Request;
  const empty: PersonalAgenda = {
    days: [],
    events: [],
    upcoming: [],
    total: 0,
    periodEvents: [],
    period: { from: '2026-11-01', to: '2026-11-30', total: 0, limit: 1000 },
  };
  const database = { query: jest.fn() };
  const identity = new IdentityService(database as unknown as DatabaseService);
  const security = {
    token: jest.fn(() => 'test-only'),
    checkOrigin: jest.fn(),
  };
  const agenda = { list: jest.fn() };
  const holidays = { forYear: jest.fn() };
  const controller = new AgendaController(
    database as unknown as DatabaseService,
    identity,
    security as unknown as IdentitySecurityService,
    agenda as unknown as AgendaService,
    holidays as unknown as AgendaHolidaysService,
    new ConfigService({ APP_URL: 'http://localhost:3000' }),
  );
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.spyOn(identity, 'authenticate').mockResolvedValue(student);
    agenda.list.mockResolvedValue(empty);
    holidays.forYear.mockResolvedValue({ status: 'unavailable', events: [] });
  });
  it('los eventos internos no esperan al proveedor externo', async () => {
    holidays.forYear.mockReturnValue(new Promise(() => {}));
    expect(await controller.list(query('2026-11-23', 'month'), request)).toBe(
      empty,
    );
    expect(holidays.forYear).not.toHaveBeenCalled();
  });
  it('todas las lecturas rechazan un rol ajeno antes de consultar datos', async () => {
    const other = Object.assign(new AgendaQuery(), query('2026-11-23'), {
      role: 'docente' as const,
    });
    await expect(controller.list(other, request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.publicHolidays({ role: 'docente', year: 2026 }, request),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.export(other, request, {} as Response),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(agenda.list).not.toHaveBeenCalled();
    expect(holidays.forYear).not.toHaveBeenCalled();
  });
  it('genera ICS interno aun cuando el proveedor no responde con feriados válidos', async () => {
    const response = { setHeader: jest.fn() };
    const output = await controller.export(
      query('2026-11-23'),
      request,
      response as unknown as Response,
    );
    expect(output).toContain('BEGIN:VCALENDAR\r\n');
    expect(output).toContain('END:VCALENDAR\r\n');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="esapiens-agenda-2026-11-01-2026-11-30.ics"',
    );
  });
  it('no genera una exportación silenciosamente incompleta', async () => {
    agenda.list.mockResolvedValue({
      ...empty,
      period: { ...empty.period, total: 10001, limit: 10000 },
    });
    await expect(
      controller.export(query('2026-11-23'), request, {} as Response),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('iCalendar RFC 5545', () => {
  const reminder: AgendaEvent = {
    id: 'one',
    title: 'Árbol; costos, cuenta\\mayor\r\nBEGIN:VEVENT ' + 'á'.repeat(100),
    day: '2099-12-31',
    kind: 'recordatorio',
    done: false,
    courseId: null,
    course: null,
    occursAt: null,
  };
  const lesson: AgendaEvent = {
    ...reminder,
    id: 'two',
    title: 'Clase',
    kind: 'clase',
    courseId: 'course',
    course: 'Contabilidad',
    occursAt: '2026-03-08T06:30:00Z',
    endsAt: '2026-03-08T07:30:00Z',
  };
  const stamp = new Date('2026-11-23T12:00:00Z');
  const render = (events: AgendaEvent[], actor = 'student') =>
    agendaIcal(
      events,
      actor,
      'estudiante',
      'America/New_York',
      'http://localhost:3000',
      stamp,
    );
  it('usa CRLF, UTF-8 y plegado de 75 octetos sin permitir inyección de eventos', () => {
    const output = render([reminder, lesson]);
    expect(
      output
        .split('\r\n')
        .every((line) => Buffer.byteLength(line, 'utf8') <= 75),
    ).toBe(true);
    expect(
      output.split('\r\n').filter((line) => line === 'BEGIN:VEVENT'),
    ).toHaveLength(2);
    const unfolded = output.replace(/\r\n /g, '');
    expect(unfolded).toContain(
      'Árbol\\; costos\\, cuenta\\\\mayor\\nBEGIN:VEVENT',
    );
    expect(output.replaceAll('\r\n', '')).not.toContain('\n');
  });
  it('conserva instantes UTC y el fin de clase durante un cambio horario', () => {
    const output = render([lesson]);
    expect(output).toContain('DTSTART:20260308T063000Z\r\n');
    expect(output).toContain('DTEND:20260308T073000Z\r\n');
  });
  it('representa recordatorios como fechas completas con fin exclusivo', () => {
    const output = render([reminder]);
    expect(output).toContain('DTSTART;VALUE=DATE:20991231\r\n');
    expect(output).toContain('DTEND;VALUE=DATE:21000101\r\n');
  });
  it('deduplica eventos y conserva UID estable sin revelar el identificador del usuario', () => {
    const first = render([lesson, lesson]);
    expect(first.split('BEGIN:VEVENT')).toHaveLength(2);
    const uid = first.match(/UID:([^\r]+)\r\n/)?.[1];
    expect(uid).toBe(render([lesson]).match(/UID:([^\r]+)\r\n/)?.[1]);
    expect(uid).not.toContain('student');
    expect(uid).not.toBe(
      render([lesson], 'another').match(/UID:([^\r]+)\r\n/)?.[1],
    );
  });
});
