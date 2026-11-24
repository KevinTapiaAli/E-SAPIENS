import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AcademicService } from './academic.service';
import { AcademicController } from './academic.controller';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { ClassroomService } from './classroom.service';
import { CourseManagementService } from './course-management.service';
import { ManagementController } from './management.controller';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { TeachingService } from './teaching.service';
import { TeachingController } from './teaching.controller';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { AgendaHolidaysService } from './agenda-holidays.service';
import { CommerceController } from './commerce.controller';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AcademicWriteLimiter } from './academic-write-limiter';
import { SavedLibraryController } from './saved-library.controller';
import { CommerceService } from './commerce.service';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { ExportsController } from './exports.controller';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [IdentityAccessModule, DatabaseModule, RedisModule],
  providers: [
    AgendaService,
    AgendaHolidaysService,
    AcademicWriteLimiter,
    CommerceService,
    EvaluationService,
    AcademicService,
    EnrollmentService,
    ClassroomService,
    CourseManagementService,
    ProgressService,
    TeachingService,
  ],
  controllers: [
    ExportsController,
    AdminDashboardController,
    SavedLibraryController,
    CommerceController,
    EvaluationController,
    AgendaController,
    AcademicController,
    EnrollmentController,
    ManagementController,
    ProgressController,
    TeachingController,
  ],
})
export class AcademicModule {}
