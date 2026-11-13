import { Module } from '@nestjs/common';
import { RuntimeModule } from './common/runtime.module';
import { HealthModule } from './modules/health/health.module';
import { GatewayModule } from './infrastructure/services/gateway.module';

@Module({
  imports: [RuntimeModule, GatewayModule, HealthModule],
})
export class AppModule {}
