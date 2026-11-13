import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const servicePorts = {
  content: 4001,
  analytics: 4002,
  identity: 4003,
  academic: 4004,
} as const;
export type ServiceName = keyof typeof servicePorts;

@Injectable()
export class ServiceClient {
  constructor(private readonly config: ConfigService) {}

  async request<T>(
    service: ServiceName,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const response = await this.forward(
      service,
      path,
      body === undefined ? 'GET' : 'POST',
      body,
      headers,
    );
    if (response.status === 204) return undefined as T;
    try {
      const result = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      if (!response.ok) {
        if ([400, 401, 403, 404, 409, 422, 429].includes(response.status)) {
          throw new HttpException(
            {
              code: result.error?.code ?? 'SERVICE_REQUEST_REJECTED',
              message: result.error?.message ?? 'Solicitud rechazada.',
            },
            response.status,
          );
        }
        throw new Error('Service unavailable');
      }
      return result as T;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw this.unavailable(service);
    }
  }

  private unavailable(service: ServiceName) {
    return new ServiceUnavailableException({
      code: `${service.toUpperCase()}_SERVICE_UNAVAILABLE`,
      message: `El servicio ${service} no está disponible.`,
    });
  }

  async forward(
    service: ServiceName,
    path: string,
    method: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const name = service.toUpperCase();
    const base =
      this.config.get<string>(`${name}_SERVICE_URL`) ??
      `http://127.0.0.1:${servicePorts[service]}`;
    const token = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!token || token.length < 32)
      throw new ServiceUnavailableException({
        code: 'SERVICE_CONFIGURATION_REQUIRED',
        message: 'Falta configurar la comunicación interna.',
      });
    try {
      const url = new URL(base);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      )
        throw new Error('Invalid service URL');
      if (
        url.protocol === 'http:' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ) {
        throw new Error('Remote services require HTTPS');
      }
      const target = new URL(`/api/v1/${path}`, url);
      if (
        target.origin !== url.origin ||
        !target.pathname.startsWith('/api/v1/')
      )
        throw new Error('Invalid service path');
      return await fetch(target, {
        method,
        headers: {
          ...headers,
          'content-type': 'application/json',
          'x-internal-service-token': token,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw this.unavailable(service);
    }
  }
}
