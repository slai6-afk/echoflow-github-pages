"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const EXPLORE = [
  { href: "/training/phoneme", label: "A' Lab", sub: "Phoneme" },
  { href: "/training/shadowing", label: "B' Shadow", sub: "Shadowing" },
  { href: "/training/import", label: "A' Import", sub: "Real World" },
];

function HeroWave() {
  const BARS = [22, 38, 54, 74, 88, 96, 82, 91, 76, 62, 94, 80, 67, 89, 73, 59, 85, 70, 48, 34];
  return (
    <div className="relative w-[420px] h-[520px] flex items-center justify-center">
      {/* Radial vignette to mimic the fading silhouette look */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: "radial-gradient(ellipse 65% 75% at 50% 50%, transparent 30%, white 80%)" }}
      />
      {/* Concentric guide rings */}
      {[0.92, 0.72, 0.52].map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-[#111]/[0.04]"
          style={{ inset: `${(1 - s) * 50}%` }}
        />
      ))}
      {/* Waveform bars */}
      <div className="flex items-end gap-[5px]">
        {BARS.map((h, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 8,
              height: h * 3.8,
              background: `rgba(10,10,10,${0.09 + (h / 100) * 0.18})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#111] overflow-hidden">
      {/* Pill Nav */}
      <nav
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-white/95 backdrop-blur-md rounded-full border border-[#e4e4e7] px-1.5 py-1.5"
        style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#111] mr-1">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" fill="white" />
            <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1" fill="none" />
            <line x1="8" y1="1" x2="8" y2="3.5" stroke="white" strokeWidth="1" />
            <line x1="8" y1="12.5" x2="8" y2="15" stroke="white" strokeWidth="1" />
            <line x1="1" y1="8" x2="3.5" y2="8" stroke="white" strokeWidth="1" />
            <line x1="12.5" y1="8" x2="15" y2="8" stroke="white" strokeWidth="1" />
          </svg>
        </div>
        {[
          { href: "/training/phoneme", label: "Lab" },
          { href: "/training/shadowing", label: "Shadow" },
          { href: "/training/import", label: "Import" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-1.5 rounded-full text-sm font-league text-[#555] hover:text-[#111] hover:bg-[#f4f4f5] transition-all"
          >
            {item.label}
          </Link>
        ))}
        <div className="w-px h-4 bg-[#e4e4e7] mx-1" />
        <Link href="/onboarding" className="px-4 py-1.5 rounded-full text-sm font-league bg-[#111] text-white hover:bg-[#333] transition-all">
          Try Demo
        </Link>
      </nav>

      {/* Hero */}
      <div className="min-h-screen flex items-center justify-between px-16 max-w-7xl mx-auto">
        {/* Left: text */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-7 max-w-md"
        >
          <p className="text-xs text-[#aaa] uppercase tracking-[0.25em] font-league">
            echoflow
          </p>

          <h1 className="font-anta text-[68px] leading-[1.02] tracking-[-0.01em] text-[#0a0a0a]">
            Enhancement<br />of human<br />expression.
          </h1>

          <p className="text-sm text-[#666] font-league leading-relaxed max-w-xs">
            AI pronunciation coaching built for tech professionals speaking English
            at the highest level.
          </p>

          {/* Explore tags — augen style */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#aaa] font-league mr-1">Explore</span>
            {EXPLORE.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="px-3.5 py-1.5 rounded-full border border-[#ddd] text-xs font-league text-[#444] hover:border-[#bbb] hover:text-[#111] transition-all"
              >
                {e.label}
              </Link>
            ))}
          </div>

          <Link
            href="/onboarding"
            className="self-start mt-2 px-6 py-3 rounded-full bg-[#111] text-white text-sm font-league tracking-wide hover:bg-[#333] transition-colors"
          >
            Try it now →
          </Link>
        </motion.div>

        {/* Right: visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15 }}
        >
          <HeroWave />
        </motion.div>
      </div>

      {/* Bottom tagline */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <p className="text-[11px] text-[#bbb] font-league tracking-widest uppercase">
          Phoneme · Shadowing · Real World
        </p>
      </div>
    </main>
  );
}
