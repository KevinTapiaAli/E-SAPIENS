import { ConfigService } from '@nestjs/config';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { ServiceClient } from './service-client';

describe('ServiceClient transport (no network)', () => {
  const token = 'a'.repeat(64);
  const client = new ServiceClient(
    new ConfigService({ INTERNAL_SERVICE_TOKEN: token }),
  );
  afterEach(() => jest.restoreAllMocks());

  it('forwards the internal credential and does not follow redirects', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"items":[]}'));
    await expect(client.request('content', 'courses?limit=3')).resolves.toEqual(
      { items: [] },
    );
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).href).toBe(
      'http://127.0.0.1:4001/api/v1/courses?limit=3',
    );
    expect(options).toMatchObject({
      method: 'GET',
      redirect: 'error',
      headers: { 'x-internal-service-token': token },
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('preserves public not-found errors', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'COURSE_NOT_FOUND', message: 'Missing' },
        }),
        { status: 404 },
      ),
    );
    try {
      await client.request('content', 'courses/missing');
      throw new Error('Expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(404);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'COURSE_NOT_FOUND',
      });
    }
  });

  it('returns 503 without retrying a failed write or leaking upstream details', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('private host details'));
    await expect(
      client.request('analytics', 'analytics/visit', { path: '/' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires credentials before sending any request', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(
      new ServiceClient(new ConfigService()).request('content', 'courses'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects remote cleartext HTTP before sending the secret', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const unsafe = new ServiceClient(
      new ConfigService({
        INTERNAL_SERVICE_TOKEN: token,
        CONTENT_SERVICE_URL: 'http://example.com',
      }),
    );
    await expect(unsafe.request('content', 'courses')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
