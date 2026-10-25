import { AnalyticsServiceModule } from './services/analytics.module';
import { startService } from './services/bootstrap';

void startService(AnalyticsServiceModule, 'analytics', 4002);
