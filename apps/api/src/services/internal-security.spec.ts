import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalServiceGuard } from './internal-security';

describe('InternalServiceGuard', () => {
  const token = 'a'.repeat(64);
  const guard = new InternalServiceGuard(
    new ConfigService({ INTERNAL_SERVICE_TOKEN: token }),
  );
  const context = (value?: string | string[]) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-internal-service-token': value } }),
      }),
    }) as ExecutionContext;
  it('rejects missing, incorrect and repeated credentials', () => {
    for (const value of [undefined, '', 'b'.repeat(64), [token, token]]) {
      expect(() => guard.canActivate(context(value))).toThrow(
        UnauthorizedException,
      );
    }
  });
  it('accepts the configured credential', () =>
    expect(guard.canActivate(context(token))).toBe(true));
  it('refuses to start without a sufficiently long secret', () => {
    expect(() => new InternalServiceGuard(new ConfigService())).toThrow(
      'INTERNAL_SERVICE_TOKEN',
    );
  });
});
