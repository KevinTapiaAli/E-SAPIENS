import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
};

export function Card({
  children,
  interactive = false,
  className = "",
}: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6",
        interactive ? "interactive-card" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
