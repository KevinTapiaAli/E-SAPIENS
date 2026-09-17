import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "neutral" | "brand" | "success" | "warning";
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  const variants = {
    neutral: "border-zinc-700 bg-zinc-800/70 text-zinc-300",
    brand: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
