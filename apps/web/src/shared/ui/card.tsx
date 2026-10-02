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
        "ui-card p-6",
        interactive ? "interactive-card" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
