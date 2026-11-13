import type { Request } from 'express';

export const internalClientIp = Symbol('internalClientIp');
export type TrustedRequest = Request & { [internalClientIp]?: string };
