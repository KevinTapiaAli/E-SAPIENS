import type { ReactNode } from "react";
import { Icon } from "./icon";

type StatePanelProps = {
  type?: "empty" | "error" | "loading";
  title: string;
  description: string;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
};
export function StatePanel({
  type = "empty",
  title,
  description,
  action,
  as: Heading = "h2",
}: StatePanelProps) {
  const styles = {
    empty: "bg-surface border-line",
    error: "bg-danger-soft border-danger",
    loading: "bg-surface border-line",
  };
  return (
    <div
      role={
        type === "error" ? "alert" : type === "loading" ? "status" : undefined
      }
      aria-live={type === "loading" ? "polite" : undefined}
      className={`rounded-2xl border px-6 py-10 text-center ${styles[type]}`}
    >
      <span
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${type === "error" ? "bg-surface text-danger" : "bg-brand-soft text-brand"}`}
      >
        <Icon
          name={
            type === "empty" ? "search" : type === "loading" ? "clock" : "info"
          }
          className="h-6 w-6"
        />
      </span>
      <Heading className="mt-5 text-xl font-semibold text-ink">{title}</Heading>
      <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
