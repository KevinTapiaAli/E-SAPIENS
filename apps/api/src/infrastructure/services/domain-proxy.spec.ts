import { NotFoundException } from '@nestjs/common';
import type { Request, Response as ExpressResponse } from 'express';
import { DomainProxyController } from './domain-proxy.controller';
import { ServiceClient } from './service-client';

describe('Domain proxy security and response fidelity (no network)', () => {
  const forward = jest.fn();
  const proxy = new DomainProxyController({
    forward,
  } as unknown as ServiceClient);
  const response = () => {
    const res = {
      getHeader: jest.fn(() => 'request-1'),
      setHeader: jest.fn(),
      status: jest.fn(),
      send: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
  };
  beforeEach(() => jest.clearAllMocks());

  it.each([200, 401, 403, 429, 503])(
    'preserves status %i and the original body',
    async (status) => {
      const body = JSON.stringify({ error: { code: 'TEST' } });
      forward.mockResolvedValue(
        new Response(body, {
          status,
          headers: {
            'content-type': 'application/json',
            'set-cookie':
              'esapiens_session=opaque; HttpOnly; SameSite=Lax; Path=/',
          },
        }),
      );
      const req = {
        originalUrl: '/api/v1/identity/login',
        method: 'POST',
        ip: '127.0.0.1',
        headers: {
          origin: 'http://localhost:3000',
          'x-internal-service-token': 'forged',
          'x-esapiens-client-ip': 'forged',
          cookie: 'session',
        },
        body: { email: 'example@example.com' },
      } as unknown as Request;
      const res = response();
      await proxy.forward(req, res as unknown as ExpressResponse);
      expect(forward).toHaveBeenCalledWith(
        'identity',
        'identity/login',
        'POST',
        req.body,
        {
          origin: 'http://localhost:3000',
          cookie: 'session',
          'x-esapiens-client-ip': '127.0.0.1',
          'x-request-id': 'request-1',
        },
      );
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.send).toHaveBeenCalledWith(Buffer.from(body));
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        expect.stringContaining('HttpOnly'),
      ]);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, no-store',
      );
    },
  );

  it('preserves binary avatars and query strings', async () => {
    const bytes = new Uint8Array([255, 216, 255, 217]);
    forward.mockResolvedValue(
      new Response(bytes, { headers: { 'content-type': 'image/jpeg' } }),
    );
    const res = response();
    await proxy.forward(
      {
        originalUrl: '/api/v1/identity/avatar?v=1',
        method: 'GET',
        headers: {},
      } as Request,
      res as unknown as ExpressResponse,
    );
    expect(forward.mock.calls[0].slice(0, 3)).toEqual([
      'identity',
      'identity/avatar?v=1',
      'GET',
    ]);
    expect(res.send).toHaveBeenCalledWith(Buffer.from(bytes));
  });

  it.each([
    '/api/v1/identity/../internal/openapi',
    '//evil.example/api/v1/identity',
    '/api/v1/identity/../../health',
  ])('rejects path escape %s', async (path) => {
    await expect(
      proxy.forward(
        { originalUrl: path, method: 'GET', headers: {} } as Request,
        response() as unknown as ExpressResponse,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(forward).not.toHaveBeenCalled();
  });
});
