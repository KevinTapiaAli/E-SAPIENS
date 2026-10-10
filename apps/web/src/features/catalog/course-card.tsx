import Link from "next/link";
import type { PublicCourse } from "@esapiens/contracts";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Icon } from "@/shared/ui/icon";

export function CourseCard({
  course,
  heading: Heading = "h2",
}: {
  course: PublicCourse;
  heading?: "h2" | "h3";
}) {
  const href = `/cursos/${encodeURIComponent(course.slug)}`;
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="brand">{course.category}</Badge>
        <Icon name="book" className="h-5 w-5 text-brand" />
      </div>
      <Heading className="mt-5 text-xl font-semibold">
        <Link
          href={href}
          prefetch={false}
          className="hover:text-brand hover:underline underline-offset-4"
        >
          {course.title}
        </Link>
      </Heading>
      <p className="mt-3 line-clamp-3 leading-7 text-muted">
        {course.description}
      </p>
      <p className="mt-5 flex items-center gap-2 text-sm text-muted">
        <Icon name="clock" className="h-4 w-4" />
        {course.level} · {course.durationHours} horas
      </p>
      <Link
        href={href}
        prefetch={false}
        className="text-link mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6"
        aria-label={`Ver temario de ${course.title}`}
      >
        Ver curso y temario <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </Card>
  );
}
