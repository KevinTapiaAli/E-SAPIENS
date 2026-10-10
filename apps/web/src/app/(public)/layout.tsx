import { SiteHeader } from "@/shared/ui/site-header";
import { SiteFooter } from "@/shared/ui/site-footer";
import { VisitTracker } from "@/features/analytics/visit-tracker";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <VisitTracker />
      {children}
      <SiteFooter />
    </>
  );
}
