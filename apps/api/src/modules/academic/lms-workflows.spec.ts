import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { SessionUser } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { IdentityService } from '../identity/identity.service';
import { TeachingService } from './teaching.service';
import { CommerceService } from './commerce.service';
import { EvaluationService } from './evaluation.service';
import { AcademicWriteLimiter } from './academic-write-limiter';
import { CreateOrderDto, ReportPaymentDto } from './commerce.dto';
import { CreateEvaluationDto, SubmitEvaluationDto } from './evaluation.dto';

describe('LMS: autorización, cobros e intentos', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    roles: ['estudiante'],
    permissions: ['classroom.study'],
  } as SessionUser;
  const other = '22222222-2222-4222-8222-222222222222';
  const client = { query: jest.fn() };
  const db = {
    query: jest.fn(),
    transaction: jest.fn(async (work) => work(client)),
  };
  const identity = { authorize: jest.fn() };
  const teaching = { course: jest.fn() };
  const commerce = (instructions = 'Banco institucional') =>
    new CommerceService(
      db as unknown as DatabaseService,
      identity as unknown as IdentityService,
      new ConfigService({ PAYMENT_INSTRUCTIONS: instructions }),
    );
  const evaluation = () =>
    new EvaluationService(
      db as unknown as DatabaseService,
      identity as unknown as IdentityService,
      teaching as unknown as TeachingService,
    );
  const row = (value: Record<string, unknown>) => ({
    rowCount: 1,
    rows: [value],
  });
  beforeEach(() => {
    jest.clearAllMocks();
    client.query.mockReset();
    identity.authorize.mockReset();
  });
  it('bloquea compras si faltan las instrucciones bancarias', async () => {
    await expect(
      commerce('').order(user, { planId: other, operationId: other }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('rechaza administrar precios sin autorización', async () => {
    identity.authorize.mockImplementation(() => {
      throw new ForbiddenException();
    });
    await expect(
      commerce().createPlan(user, {
        courseId: other,
        name: 'Curso',
        price: '10.00',
        currency: 'BOB',
        days: 30,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('repetir una orden propia no crea otra ni recalcula su importe', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id }))
      .mockResolvedValueOnce(row({ usuario_id: user.id }))
      .mockResolvedValueOnce(row({ found: 1 }));
    await expect(
      commerce().order(user, { planId: other, operationId: other }),
    ).resolves.toMatchObject({ id: other });
    expect(client.query).toHaveBeenCalledTimes(3);
  });
  it('no reutiliza una clave de compra ajena', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id }))
      .mockResolvedValueOnce(row({ usuario_id: other }))
      .mockResolvedValueOnce(row({ found: 1 }));
    await expect(
      commerce().order(user, { planId: other, operationId: other }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('no permite reportar pagos en órdenes ajenas', async () => {
    client.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(
      commerce().report(user, other, { method: 'qr', reference: 'BANCO-123' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(client.query.mock.calls[0][1]).toEqual([other, user.id]);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
  it('impide que el administrador apruebe su propio pago', async () => {
    client.query
      .mockResolvedValueOnce(row({ orden_id: other }))
      .mockResolvedValueOnce(row({ usuario_id: user.id }));
    await expect(
      commerce().review(user, other, {
        decision: 'confirmar',
        reason: 'Verificado en banco',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.query).toHaveBeenCalledTimes(2);
  });
  it('responde idempotentemente a un pago ya confirmado', async () => {
    client.query
      .mockResolvedValueOnce(row({ orden_id: other }))
      .mockResolvedValueOnce(row({ usuario_id: other }))
      .mockResolvedValueOnce(row({ estado: 'confirmado' }));
    await expect(
      commerce().review(user, other, {
        decision: 'confirmar',
        reason: 'Verificado en banco',
      }),
    ).resolves.toHaveProperty('message');
    expect(client.query).toHaveBeenCalledTimes(3);
  });
  it('no confirma un pago vencido', async () => {
    client.query
      .mockResolvedValueOnce(row({ orden_id: other }))
      .mockResolvedValueOnce(
        row({ usuario_id: other, estado: 'pendiente', vence_en: '2020-01-01' }),
      )
      .mockResolvedValueOnce(row({ estado: 'pendiente' }));
    await expect(
      commerce().review(user, other, {
        decision: 'confirmar',
        reason: 'Verificado en banco',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(client.query).toHaveBeenCalledTimes(3);
  });
  it('no admite importes ni estados inyectados al crear una compra', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      planId: other,
      operationId: other,
      amount: 0,
      status: 'pagada',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['amount', 'status']),
    );
  });
  it('normaliza referencias y rechaza formatos no bancarios', async () => {
    const dto = plainToInstance(ReportPaymentDto, {
      method: 'qr',
      reference: ' banco-123 ',
    });
    expect(dto.reference).toBe('BANCO-123');
    expect(await validate(dto)).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ReportPaymentDto, {
          method: 'qr',
          reference: '<script>',
        }),
      ),
    ).not.toHaveLength(0);
  });
  it('no inicia evaluaciones sin matrícula y acceso vigentes', async () => {
    client.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(evaluation().start(user, other, other)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(client.query).toHaveBeenCalledTimes(1);
  });
  it('un estudiante no puede consultar las notas del grupo', async () => {
    await expect(
      evaluation().results(user, other, other, {
        role: 'estudiante',
        limit: 12,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(teaching.course).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });
  it('no acepta un intento de otra matrícula', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id, attempts: 3 }))
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(
      evaluation().submit(user, other, other, other, { answers: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(client.query.mock.calls[1][1]).toEqual([other, other, user.id]);
  });
  it('no permite entregar después de vencer el plazo', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id, attempts: 3 }))
      .mockResolvedValueOnce(
        row({ estado: 'en_curso', vence_en: '2020-01-01' }),
      );
    await expect(
      evaluation().submit(user, other, other, other, { answers: [] }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(client.query).toHaveBeenCalledTimes(2);
  });
  it('impide crear intentos adicionales al límite', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id, attempts: 1 }))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(row({ n: 1 }));
    await expect(evaluation().start(user, other, other)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(client.query).toHaveBeenCalledTimes(4);
  });
  it('recupera el intento activo sin consultar claves de respuesta', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id, attempts: 1 }))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(row({ id: other, expiresAt: '2030-01-01' }))
      .mockResolvedValueOnce({
        rows: [{ id: other, text: 'Pregunta', options: [] }],
      });
    const result = await evaluation().start(user, other, other);
    expect(result.id).toBe(other);
    expect(client.query.mock.calls[3][0]).not.toMatch(
      /es_correcta|explicacion|SELECT \*/i,
    );
    expect(client.query).toHaveBeenCalledTimes(4);
  });
  it('devuelve la nota de PostgreSQL, sin recibirla del cliente', async () => {
    client.query
      .mockResolvedValueOnce(row({ id: user.id, attempts: 3 }))
      .mockResolvedValueOnce(
        row({ estado: 'en_curso', vence_en: new Date(Date.now() + 60000) }),
      )
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(row({ score: 50 }));
    await expect(
      evaluation().submit(user, other, other, other, {
        answers: [{ questionId: other, optionId: user.id }],
      }),
    ).resolves.toMatchObject({ score: 50 });
    expect(JSON.parse(client.query.mock.calls[2][1][1])).toEqual([
      { pregunta_id: other, opciones: [user.id] },
    ]);
  });
  it('rechaza respuestas duplicadas y notas inyectadas', async () => {
    const dto = plainToInstance(SubmitEvaluationDto, {
      score: 100,
      answers: [
        { questionId: other, optionId: user.id },
        { questionId: other, optionId: user.id },
      ],
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['score', 'answers']),
    );
  });
  it('rechaza una clave correcta fuera de las opciones', async () => {
    const dto = {
      moduleId: other,
      title: 'Evaluación',
      minutes: 30,
      attempts: 2,
      passingScore: 60,
      questions: [{ text: 'Pregunta', options: ['A', 'B'], correctIndex: 2 }],
    } as CreateEvaluationDto;
    await expect(evaluation().create(user, other, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('el límite distribuido rechaza exceso y falla cerrado sin Redis', async () => {
    const redis = {
      consume: jest
        .fn()
        .mockResolvedValueOnce(31)
        .mockRejectedValueOnce(new Error('offline')),
    };
    const limiter = new AcademicWriteLimiter(redis as unknown as RedisService);
    await expect(limiter.check(user.id)).rejects.toMatchObject({ status: 429 });
    await expect(limiter.check(user.id)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
