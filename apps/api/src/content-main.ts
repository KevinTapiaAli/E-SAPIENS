import { ContentServiceModule } from './services/content.module';
import { startService } from './services/bootstrap';

void startService(ContentServiceModule, 'content', 4001);
