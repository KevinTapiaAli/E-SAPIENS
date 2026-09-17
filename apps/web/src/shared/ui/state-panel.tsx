import type { ReactNode } from "react";

type StatePanelProps = {
  type?: "empty" | "error" | "loading";
  title: string;
  description: string;
  action?: ReactNode;
};

export function StatePanel({
  type = "empty",
  title,
  description,
  action,
}: StatePanelProps) {
  const styles = {
    empty: {
      dot: "bg-zinc-400",
      border: "border-zinc-800",
    },
    error: {
      dot: "bg-red-400",
      border: "border-red-500/20",
    },
    loading: {
      dot: "bg-violet-400",
      border: "border-violet-500/20",
    },
  };

  const current = styles[type];

  return (
    <div
      className={`rounded-2xl border ${current.border} bg-zinc-900/50 px-6 py-10 text-center`}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${current.dot}`}
        />
      </div>

      <h3 className="mt-5 text-lg font-semibold">{title}</h3>

      <p className="mx-auto mt-2 max-w-md leading-7 text-zinc-400">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
