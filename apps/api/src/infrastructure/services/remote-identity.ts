import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SessionUser } from '@esapiens/contracts';
import { IdentityService } from '../../modules/identity/identity.service';
import { IdentitySecurityService } from '../../modules/identity/identity-security.service';
import { ServiceClient } from './service-client';

/** Gateway has no SQL pool and never creates or changes sessions. */
@Injectable()
export class RemoteIdentityService {
  constructor(
    private readonly client: ServiceClient,
    private readonly security: IdentitySecurityService,
  ) {}

  authenticate(token?: string): Promise<SessionUser> {
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException();
    return this.client.request('identity', 'identity/me', undefined, {
      cookie: `${this.security.cookieName}=${token}`,
    });
  }

  // This policy is synchronous and contains no infrastructure access.
  authorize = IdentityService.prototype.authorize;
}
