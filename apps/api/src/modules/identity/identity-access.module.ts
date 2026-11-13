import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { IdentityService } from './identity.service';
import { IdentitySecurityService } from './identity-security.service';
import { UserManagementService } from './user-management.service';

/** Shared authorization providers; never installs identity HTTP routes. */
@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [IdentityService, IdentitySecurityService, UserManagementService],
  exports: [IdentityService, IdentitySecurityService, UserManagementService],
})
export class IdentityAccessModule {}
