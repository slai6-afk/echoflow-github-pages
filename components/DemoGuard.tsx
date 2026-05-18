"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Pages that are always accessible (no session flag needed)
const OPEN_PATHS = ["/", "/onboarding", "/auth"];

/**
 * Demo session guard.
 *
 * sessionStorage is cleared on every hard refresh / new tab, so each fresh
 * visit starts from the landing page. Normal in-app navigation works fine
 * because the flag persists for the lifetime of the tab.
 */
export default function DemoGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isOpen = OPEN_PATHS.some((p) =>
      p === "/" ? pathname === "/" : pathname.startsWith(p)
    );

    if (isOpen) {
      // Mark that the user has been through the entry point
      sessionStorage.setItem("demo_session", "1");
    } else if (!sessionStorage.getItem("demo_session")) {
      // Refreshed directly on an inner page — send back to landing
      router.replace("/");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
