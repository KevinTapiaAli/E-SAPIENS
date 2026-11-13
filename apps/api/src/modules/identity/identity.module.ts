import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { IdentityAccessModule } from './identity-access.module';
import { IdentityController } from './identity.controller';
import { AvatarController } from './avatar.controller';

@Module({
  imports: [DatabaseModule, IdentityAccessModule],
  controllers: [IdentityController, AvatarController],
  exports: [IdentityAccessModule],
})
export class IdentityModule {}
