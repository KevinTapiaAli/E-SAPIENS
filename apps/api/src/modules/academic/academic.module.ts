import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
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

@Module({
  imports: [IdentityModule, DatabaseModule],
  providers: [
    AcademicService,
    EnrollmentService,
    ClassroomService,
    CourseManagementService,
    ProgressService,
    TeachingService,
  ],
  controllers: [
    AgendaController,
    AcademicController,
    EnrollmentController,
    ManagementController,
    ProgressController,
    TeachingController,
  ],
})
export class AcademicModule {}
