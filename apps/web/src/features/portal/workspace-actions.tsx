import Link from "next/link";
import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { Icon } from "@/shared/ui/icon";
import {
  portalNavigation,
  sectionDescriptions,
  workspaceGuides,
} from "./navigation";

export function WorkspaceActions({
  role,
  user,
}: {
  role: WorkspaceRole;
  user: SessionUser;
}) {
  const guide = workspaceGuides[role];
  const available = portalNavigation(role, user);
  const shortcuts = guide.shortcuts.flatMap((section) =>
    available.filter((item) => item.section === section),
  );
  if (!shortcuts.length) return null;
  return (
    <section aria-label="Accesos frecuentes" className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{guide.title}</h2>
        <p className="mt-2 text-sm text-muted">{guide.description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item, index) => (
          <Link
            key={item.section}
            href={item.href}
            prefetch={false}
            className={`group rounded-2xl border p-5 transition-colors ${index === 0 ? "border-brand bg-brand-soft hover:bg-surface" : "border-line bg-surface hover:border-brand"}`}
          >
            <div className="flex items-center justify-between gap-2 text-brand">
              <Icon name={item.icon} />
              <Icon name="arrow" className="h-4 w-4" />
            </div>
            <h3 className="mt-4 font-semibold">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {sectionDescriptions[item.section]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
