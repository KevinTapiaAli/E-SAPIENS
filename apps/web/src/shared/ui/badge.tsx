import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "neutral" | "brand" | "success" | "warning";
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  const variants = {
    neutral: "bg-surface-soft text-muted",
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };

  return (
    <span
      className={`inline-flex w-fit items-center rounded-md px-2.5 py-1 text-xs font-semibold leading-5 ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
