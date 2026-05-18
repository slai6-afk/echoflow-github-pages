"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/training/phoneme", label: "Lab" },
  { href: "/training/shadowing", label: "Shadow" },
  { href: "/training/import", label: "Import" },
];

export default function PillNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-white/95 backdrop-blur-md rounded-full border border-[#e4e4e7] px-1.5 py-1.5"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.03)" }}>
      {/* Logo mark */}
      <Link
        href="/dashboard"
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f4f4f5] transition-colors mr-1"
        aria-label="Home"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" fill="#111" />
          <circle cx="8" cy="8" r="6.5" stroke="#111" strokeWidth="1" fill="none" />
          <line x1="8" y1="1" x2="8" y2="3.5" stroke="#111" strokeWidth="1" />
          <line x1="8" y1="12.5" x2="8" y2="15" stroke="#111" strokeWidth="1" />
          <line x1="1" y1="8" x2="3.5" y2="8" stroke="#111" strokeWidth="1" />
          <line x1="12.5" y1="8" x2="15" y2="8" stroke="#111" strokeWidth="1" />
        </svg>
      </Link>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-4 py-1.5 rounded-full text-sm font-league transition-all ${
            isActive(item.href)
              ? "bg-[#111] text-white"
              : "text-[#555] hover:text-[#111] hover:bg-[#f4f4f5]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
