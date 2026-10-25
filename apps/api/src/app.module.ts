import { Module } from '@nestjs/common';
import { RuntimeModule } from './common/runtime.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AcademicModule } from './modules/academic/academic.module';
import { GatewayModule } from './infrastructure/services/gateway.module';

@Module({
  imports: [
    RuntimeModule,
    GatewayModule,
    HealthModule,
    IdentityModule,
    AcademicModule,
  ],
})
export class AppModule {}
