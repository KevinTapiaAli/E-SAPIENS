/** Contratos públicos de transporte. Importar siempre con `import type`. */
export type WorkspaceRole = "estudiante" | "docente" | "administrador";
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timeZone: string;
  roles: string[];
  permissions: string[];
}
export interface DashboardCourse {
  id: string;
  title: string;
  status: string;
}
export interface WorkspaceDashboard {
  user: SessionUser;
  role: WorkspaceRole;
  courses: DashboardCourse[];
  counts: { label: string; value: number }[];
}
export interface PendingAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  requestedAt: string;
}

export interface AcademicCourse {
  id: string;
  title: string;
  category: string;
  status: string;
  enrollmentStatus: string | null;
  teachers: string[];
  enrollmentCount: number | null;
  totalLessons: number;
  completedLessons: number | null;
}
export interface AcademicPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roles: string[];
  specialty: string | null;
  curriculumUrl: string | null;
  qualificationReview: string | null;
  qualificationReviewedAt: string | null;
  profileRevision: number | null;
}

export interface TeachingCourse {
  id: string;
  title: string;
  modules: { id: string; title: string; published: boolean }[];
}
export interface TeachingMaterial {
  id: string;
  moduleId: string;
  module: string;
  title: string;
  kind: "apoyo" | "contenido" | "referencia";
  content: string;
  url: string | null;
  published: boolean;
  revision: number;
}
export interface TeachingTask {
  id: string;
  moduleId: string;
  module: string;
  title: string;
  instructions: string;
  dueAt: string;
  allowLate: boolean;
  maxSubmissions: number;
  published: boolean;
  revision: number;
  submissionCount: number;
  pendingReviews: number;
}
export interface TaskSubmission {
  grade: number | null;
  id: string;
  student: string;
  attempt: number;
  text: string | null;
  comment: string;
  url: string | null;
  submittedAt: string;
  feedback: {
    id: string;
    teacher: string;
    comment: string;
    createdAt: string;
  }[];
}
export interface AcademicEnrollment {
  id: string;
  student: string;
  course: string;
  status: string;
  enrolledAt: string;
  reason: string | null;
}
export interface AcademicOverview {
  metrics: { label: string; value: number }[];
  courses: AcademicCourse[];
  distribution: { label: string; value: number }[];
  courseDistribution?: { label: string; value: number }[];
  progressSummary?: AcademicProgressSummary;
}

export type LearningStage =
  "sin_contenido" | "sin_iniciar" | "en_curso" | "completado";
export interface AcademicProgressSummary {
  enrollments: number;
  students: number;
  averagePercent: number | null;
  notStarted: number;
  inProgress: number;
  completed: number;
  withoutContent: number;
  inactive: number;
  withoutCoverage: number;
}
export interface StudentProgress {
  taskAverage: number | null;
  gradedTasks: number;
  submittedTasks: number;
  attendedClasses: number;
  finishedClasses: number;
  id: string;
  student: string;
  courseId: string;
  course: string;
  enrollmentStatus: string;
  accountStatus: string;
  totalLessons: number;
  completedLessons: number;
  percent: number | null;
  lastActivityAt: string | null;
  enrolledAt: string;
  stage: LearningStage;
  inactive: boolean;
  hasCoverage: boolean;
}
export interface StudentProgressDetail {
  enrollment: StudentProgress;
  modules: {
    id: string;
    title: string;
    totalLessons: number;
    completedLessons: number;
    lastActivityAt: string | null;
    available: boolean;
    hasCoverage: boolean;
  }[];
}
export interface AcademicReport {
  total: number;
  students: number;
  average: number | null;
  inactive: number;
  missing: number;
  bars: { label: string; value: number | null }[];
  distribution: { label: string; value: number }[];
  timeline: { label: string; value: number }[];
}
export interface PersonalAgenda {
  days: { day: string; count: number }[];
  events: {
    id: string;
    title: string;
    day: string;
    kind: "recordatorio" | "tarea" | "clase";
    done: boolean;
    courseId: string | null;
    course: string | null;
  }[];
  total: number;
}

export interface ManagedLesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  order: number;
  durationMinutes: number;
  published: boolean;
  required: boolean;
  revision: number;
}
export interface ManagedModule {
  id: string;
  title: string;
  description: string;
  order: number;
  published: boolean;
  revision: number;
  lessons: ManagedLesson[];
}
export interface ManagedCourse {
  id: string;
  title: string;
  category: string;
  description: string;
  objectives: string;
  level: string;
  durationHours: number;
  status: string;
  revision: number;
  requireLessons: boolean;
  exam: string;
  enrolled: boolean;
  modules: ManagedModule[];
}
export interface ManagedLessonDetail {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  enrolled: boolean;
  lesson: ManagedLesson;
}

export interface CourseOffering {
  id: string;
  title: string;
  description: string;
  category: string;
  enrollmentStatus: string | null;
  requestStatus: string | null;
  requestReason: string | null;
}
export interface EnrollmentRequest {
  id: string;
  student: string;
  course: string;
  status: string;
  requestedAt: string;
  reason: string | null;
  enrollmentId: string | null;
}
export interface EnrollmentAccess {
  id: string;
  nextGrantCursor: string | null;
  student: string;
  course: string;
  status: string;
  modules: { id: string; title: string; published: boolean; order: number }[];
  grants: {
    id: string;
    module: string;
    startsAt: string;
    endsAt: string;
    revokedAt: string | null;
    reason: string | null;
    source: "institutional" | "purchase";
  }[];
}
export interface ClassroomLessonSummary {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  completed: boolean;
}
export interface ClassroomModule {
  id: string;
  title: string;
  description: string;
  available: boolean;
  accessReason: string;
  accessUntil: string | null;
  lessons: ClassroomLessonSummary[];
}
export interface ClassroomCourse {
  id: string;
  title: string;
  enrollmentStatus: string;
  requiresExam: boolean;
  modules: ClassroomModule[];
}
export interface ClassroomLesson extends ClassroomLessonSummary {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  content: string | null;
  canComplete: boolean;
}

export interface PublicPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PublicCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  durationHours: number;
}

export interface PublicLesson {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
}

export interface PublicCourseModule {
  id: string;
  title: string;
  lessons: PublicLesson[];
}

export interface PublicCourseDetail extends PublicCourse {
  objectives: string;
  modules: PublicCourseModule[];
}

export interface PublicLibraryItem {
  id: string;
  title: string;
  type: "libro" | "articulo" | "guia" | "video";
  description: string;
  publisher: string | null;
  year: number | null;
  isbn: string | null;
  authors: string[];
}

export interface PublicLibrarySection {
  title: string;
  pageStart: number | null;
  pageEnd: number | null;
}

export interface PublicLibraryDetail extends PublicLibraryItem {
  sections: PublicLibrarySection[];
}
