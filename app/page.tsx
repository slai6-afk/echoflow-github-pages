"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import WaveformBackground from "@/components/ui/WaveformBackground";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      <WaveformBackground />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Eyebrow label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="h-px w-12 bg-insight-blue-glow opacity-60" />
          <span className="text-xs tracking-[0.25em] uppercase text-muted font-league">
            AI Pronunciation Coach
          </span>
          <div className="h-px w-12 bg-insight-blue-glow opacity-60" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-anta text-7xl md:text-8xl lg:text-9xl leading-none tracking-tight gradient-text mb-6"
        >
          EchoFlow
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-xl md:text-2xl text-muted font-league font-light mb-16 max-w-lg leading-relaxed"
        >
          Your linguistic fingerprint, decoded. Speak with the precision of a
          native speaker.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <button
            onClick={() => router.push("/onboarding")}
            className="group relative px-12 py-5 rounded-2xl bg-insight-blue text-white font-league font-semibold text-lg tracking-wide transition-all duration-300 hover:bg-insight-blue-light hover:scale-[1.02] active:scale-[0.98] glow-blue"
          >
            Begin Your Assessment
          </button>
          <p className="text-xs text-muted tracking-wider">
            Takes 5 minutes · No account required
          </p>
        </motion.div>

        {/* Feature icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-24 grid grid-cols-3 gap-8 w-full max-w-lg"
        >
          {[
            { label: "Phoneme\nAnalysis", icon: "◈" },
            { label: "L1\nInterference", icon: "◉" },
            { label: "Daily\nShadowing", icon: "◎" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2">
              <span className="text-insight-blue-glow text-2xl">{f.icon}</span>
              <span className="text-xs text-muted text-center leading-relaxed whitespace-pre-line tracking-wide uppercase">
                {f.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
