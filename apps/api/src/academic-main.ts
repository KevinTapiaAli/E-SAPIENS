import { AcademicServiceModule } from './services/academic.module';
import { startService } from './services/bootstrap';

void startService(AcademicServiceModule, 'academic', 4004);
