/** Contratos públicos de transporte. Importar siempre con `import type`. */
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
