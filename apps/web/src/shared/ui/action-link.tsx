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
  return (
    <Link href={href} className={`button button-${variant}`}>
      {children}
    </Link>
  );
}
