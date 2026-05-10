"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import WaveformBackground from "@/components/ui/WaveformBackground";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6">
      <WaveformBackground />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.35),transparent_40%)]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="h-px w-12 bg-foreground/30" />
          <span className="text-xs tracking-[0.3em] uppercase text-foreground/70 font-league">
            AI Pronunciation Coach
          </span>
          <div className="h-px w-12 bg-foreground/30" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-anta text-7xl md:text-8xl lg:text-9xl leading-none tracking-tight gradient-text mb-6"
        >
          EchoFlow
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-xl md:text-2xl text-foreground/88 font-league font-light mb-14 max-w-2xl leading-relaxed"
        >
          Personal brand level speaking flow. Make English practice feel playful,
          sharp, and effortless without losing focus.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <button
            onClick={() => router.push("/onboarding")}
            className="group relative px-12 py-4 btn-bauhaus text-lg tracking-wide"
          >
            Begin Your Assessment
          </button>
          <p className="text-xs text-foreground/65 tracking-wider uppercase">
            Takes 5 minutes · No account required
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-20 grid grid-cols-3 gap-8 w-full max-w-2xl"
        >
          {[
            { label: "Phoneme\nAnalysis", icon: "circle" },
            { label: "L1\nInterference", icon: "hex" },
            { label: "Daily\nShadowing", icon: "mesh" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-3">
              <span className="text-insight-blue-glow text-2xl">
                {f.icon === "circle" && (
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <circle cx="19" cy="19" r="16" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="19" cy="19" r="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                )}
                {f.icon === "hex" && (
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <polygon points="19,3 32,10 32,27 19,35 6,27 6,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="6" y1="10" x2="32" y2="27" stroke="currentColor" strokeWidth="1" />
                    <line x1="32" y1="10" x2="6" y2="27" stroke="currentColor" strokeWidth="1" />
                  </svg>
                )}
                {f.icon === "mesh" && (
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <circle cx="19" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="8" cy="19" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="30" cy="19" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="19" cy="31" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="13.3" y1="11.4" x2="24.7" y2="26.6" stroke="currentColor" strokeWidth="1" />
                    <line x1="24.7" y1="11.4" x2="13.3" y2="26.6" stroke="currentColor" strokeWidth="1" />
                  </svg>
                )}
              </span>
              <span className="text-xs text-foreground/70 text-center leading-relaxed whitespace-pre-line tracking-wide uppercase">
                {f.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
