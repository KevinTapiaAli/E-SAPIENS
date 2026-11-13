import { IdentityServiceModule } from './services/identity.module';
import { startService } from './services/bootstrap';

void startService(IdentityServiceModule, 'identity', 4003);
