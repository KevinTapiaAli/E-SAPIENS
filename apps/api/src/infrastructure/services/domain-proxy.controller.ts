import {
  All,
  Controller,
  NotFoundException,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ServiceClient, type ServiceName } from './service-client';

@ApiExcludeController()
@Controller()
export class DomainProxyController {
  constructor(private readonly client: ServiceClient) {}

  @All(['identity', 'identity/*path', 'academic', 'academic/*path'])
  async forward(@Req() req: Request, @Res() res: Response) {
    // Resolve against a fixed origin, reject normalization into another domain.
    const url = new URL(req.originalUrl, 'http://gateway');
    const match = /^\/api\/v1\/(identity|academic)(?:\/|$)/.exec(url.pathname);
    if (
      url.origin !== 'http://gateway' ||
      !match ||
      !['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
    )
      throw new NotFoundException();
    const headers: Record<string, string> = {};
    for (const name of [
      'cookie',
      'origin',
      'sec-fetch-site',
      'x-esapiens-visitor',
      'dnt',
      'sec-gpc',
    ]) {
      const value = req.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    // Never trust a caller-supplied internal token, forwarding IP or request ID.
    headers['x-esapiens-client-ip'] = req.ip ?? '';
    headers['x-request-id'] = String(res.getHeader('X-Request-Id') ?? '');
    const upstream = await this.client.forward(
      match[1] as ServiceName,
      url.pathname.slice('/api/v1/'.length) + url.search,
      req.method,
      ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      headers,
    );
    let bytes: Buffer;
    try {
      bytes = Buffer.from(await upstream.arrayBuffer());
    } catch {
      throw new ServiceUnavailableException(
        'El servicio no pudo completar la respuesta.',
      );
    }
    for (const name of ['content-type', 'cache-control', 'retry-after']) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.setHeader('Cache-Control', 'private, no-store');
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.status(upstream.status).send(bytes);
  }
}
