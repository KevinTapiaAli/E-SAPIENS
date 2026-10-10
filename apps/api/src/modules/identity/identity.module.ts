import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { IdentitySecurityService } from './identity-security.service';
import { UserManagementService } from './user-management.service';
import { AvatarController } from './avatar.controller';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [IdentityController, AvatarController],
  providers: [IdentityService, IdentitySecurityService, UserManagementService],
  exports: [IdentityService, IdentitySecurityService, UserManagementService],
})
export class IdentityModule {}
