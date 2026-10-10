"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitTracker({ resource }: { resource?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const path = resource ?? pathname;
    if (
      !/^\/(?:cursos(?:\/[a-z0-9-]{1,200})?|biblioteca(?:\/[a-f0-9-]{36})?|registro|login|oferta)?$/.test(
        path,
      )
    )
      return;
    let sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    function schedule() {
      if (timer) clearTimeout(timer);
      if (sent || document.visibilityState !== "visible") return;
      timer = setTimeout(() => {
        if (
          navigator.doNotTrack === "1" ||
          (navigator as Navigator & { globalPrivacyControl?: boolean })
            .globalPrivacyControl ||
          document.cookie.split("; ").includes("esapiens_measurement=off")
        )
          return;
        sent = true;
        void fetch("/api/analytics/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
          signal: controller.signal,
        }).catch(() => undefined);
      }, 1000);
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("measurement-preference", schedule);
    return () => {
      if (timer) clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("measurement-preference", schedule);
    };
  }, [pathname, resource]);
  return null;
}
