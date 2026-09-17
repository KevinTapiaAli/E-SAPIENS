import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function ActionLink({
  href,
  children,
  variant = "primary",
}: ActionLinkProps) {
  const styles =
    variant === "primary"
      ? "bg-violet-500 text-white hover:bg-violet-400"
      : "border border-zinc-700 bg-zinc-950/40 text-white hover:border-violet-500/60 hover:bg-zinc-900";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 font-semibold transition ${styles}`}
    >
      {children}
    </Link>
  );
}
