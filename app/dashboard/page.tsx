"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PillNav from "@/components/ui/PillNav";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase-browser";
import {
  aggregateFromSupabaseErrors,
  generateLinguisticInsights,
  type FocusAreaCard,
  type StoredPhonemeError,
} from "@/lib/phonemeAnalysis";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  sessions: number;
  streak: number;
  phonemesFixed: number;
  avgScore: number | null;
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse();
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff =
      (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  return streak;
}

// ─── Visual: score arc ────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const r = 88;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75; // 270° arc
  const color = score >= 85 ? "#2d6a4f" : score >= 65 ? "#c9853e" : "#c0392b";

  return (
    <svg width="220" height="220" viewBox="0 0 220 220" className="rotate-[135deg]">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#f0f0f0" strokeWidth="8" />
      <circle
        cx="110" cy="110" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

function HeroPattern() {
  const BARS = [18, 32, 52, 70, 85, 94, 79, 88, 74, 60, 92, 77, 63, 86, 71, 57, 82, 66, 44, 28];
  return (
    <div className="relative flex items-end gap-[6px] h-40">
      {BARS.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 7,
            height: `${h}%`,
            background: `rgba(10,10,10,${0.04 + (h / 100) * 0.12})`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Module cards ─────────────────────────────────────────────────────────────

const MODULES = [
  {
    href: "/training/phoneme",
    tag: "A' Lab",
    title: "Phoneme Lab",
    desc: "Targeted drills for your weakest sounds",
    accent: "#1d3557",
  },
  {
    href: "/training/shadowing",
    tag: "B' Shadow",
    title: "Daily Shadowing",
    desc: "Mirror native speakers, sentence by sentence",
    accent: "#2d6a4f",
  },
  {
    href: "/training/import",
    tag: "A' Import",
    title: "Real World",
    desc: "Upload a meeting recording for full analysis",
    accent: "#7b4f9e",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [focusCards, setFocusCards] = useState<FocusAreaCard[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    async function fetchStats() {
      const supabase = createClient();
      const uid = user?.id;

      if (!uid) {
        setStats({ sessions: 0, streak: 0, phonemesFixed: 0, avgScore: null });
        setStatsLoading(false);
        return;
      }

      const [logsRes, phonemesRes] = await Promise.all([
        supabase
          .from("shadowing_logs")
          .select("overall_score, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("phoneme_errors")
          .select("expected_phoneme, actual_phoneme, accuracy_score, word")
          .eq("user_id", uid),
      ]);

      const logs = logsRes.data ?? [];
      const sessions = logs.length;
      const avgScore = sessions
        ? Math.round(logs.reduce((s, r) => s + r.overall_score, 0) / sessions)
        : null;
      const streak = calcStreak(logs.map((r) => r.created_at));
      const phonemeRows = (phonemesRes.data ?? []) as StoredPhonemeError[];

      setStats({ sessions, streak, phonemesFixed: phonemeRows.length, avgScore });
      setStatsLoading(false);

      if (phonemeRows.length >= 3) {
        setInsightsLoading(true);
        try {
          const errorProfile = aggregateFromSupabaseErrors(phonemeRows);
          const nativeLang =
            (user as { user_metadata?: { native_language?: string } })
              ?.user_metadata?.native_language ?? "";
          const cards = await generateLinguisticInsights(errorProfile, nativeLang);
          setFocusCards(cards);
        } catch (err) {
          console.warn("insights fetch failed:", err);
        } finally {
          setInsightsLoading(false);
        }
      }
    }

    fetchStats();
  }, [user, userLoading]);

  const isNewUser = !statsLoading && stats?.sessions === 0;
  const score = stats?.avgScore ?? 0;

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <PillNav />

      {/* Hero section */}
      <section className="pt-28 pb-12 px-10 max-w-6xl mx-auto flex items-start justify-between gap-12">
        {/* Left: brand + headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6 flex-1"
        >
          <p className="text-xs text-[#aaa] uppercase tracking-[0.25em] font-league">echoflow</p>
          <h1 className="font-anta text-[64px] leading-[1.02] text-[#0a0a0a]">
            {isNewUser ? "Let's Begin." : "Your Flow."}
          </h1>

          {/* Stats chips */}
          {!statsLoading && stats && (
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "Sessions", value: stats.sessions },
                { label: "Streak", value: stats.streak ? `${stats.streak}d` : "—" },
                { label: "Avg Score", value: stats.avgScore ?? "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-baseline gap-1.5 px-4 py-2 rounded-full border border-[#e8e8e8] bg-[#fafafa]"
                >
                  <span className="font-anta text-lg text-[#111]">{s.value}</span>
                  <span className="text-[10px] font-league text-[#aaa] uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Module explore tags */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-xs text-[#aaa] font-league mr-1">Explore</span>
            {MODULES.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="px-3.5 py-1.5 rounded-full border border-[#ddd] text-xs font-league text-[#444] hover:border-[#bbb] hover:text-[#111] transition-all"
              >
                {m.tag}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Right: score arc + waveform */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-shrink-0 flex flex-col items-center gap-4"
        >
          {score > 0 ? (
            <div className="relative flex items-center justify-center">
              <ScoreArc score={score} />
              <div className="absolute flex flex-col items-center">
                <span className="font-anta text-4xl text-[#111]">{score}</span>
                <span className="text-[10px] font-league text-[#aaa] uppercase tracking-widest">Overall</span>
              </div>
            </div>
          ) : (
            <div className="opacity-60">
              <HeroPattern />
            </div>
          )}
        </motion.div>
      </section>

      {/* Divider */}
      <div className="h-px bg-[#f0f0f0] mx-10" />

      {/* Modules grid */}
      <section className="px-10 py-12 max-w-6xl mx-auto">
        <p className="text-[10px] text-[#bbb] uppercase tracking-[0.3em] font-league mb-6">
          Training Modules
        </p>
        <div className="grid grid-cols-3 gap-4">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <Link
                href={m.href}
                className="group block p-6 rounded-2xl border border-[#f0f0f0] hover:border-[#ddd] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all bg-white"
              >
                {/* Tag */}
                <span
                  className="inline-block text-[10px] font-league uppercase tracking-widest px-2 py-0.5 rounded mb-4"
                  style={{ background: `${m.accent}12`, color: m.accent }}
                >
                  {m.tag}
                </span>
                <p className="font-anta text-xl text-[#111] mb-1">{m.title}</p>
                <p className="text-xs text-[#888] font-league leading-relaxed">{m.desc}</p>
                <div className="mt-5 flex items-center gap-1 text-xs font-league text-[#bbb] group-hover:text-[#666] transition-colors">
                  Open
                  <svg className="w-3 h-3 translate-y-px" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.5 6h7m-3-3 3 3-3 3" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Priority Focus Areas */}
      {!isNewUser && !statsLoading && (
        <section className="px-10 pb-16 max-w-6xl mx-auto">
          <div className="h-px bg-[#f0f0f0] mb-12" />
          <p className="text-[10px] text-[#bbb] uppercase tracking-[0.3em] font-league mb-6">
            Priority Focus Areas
          </p>

          {insightsLoading && (
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl border border-[#f0f0f0] animate-pulse bg-[#fafafa]" />
              ))}
            </div>
          )}

          {!insightsLoading && focusCards.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {focusCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="p-5 rounded-2xl border border-[#f0f0f0] bg-white"
                >
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-anta text-2xl text-[#111]">{card.phonemeSymbol}</span>
                    <span className="text-xs font-league text-[#bbb]">{card.avgScore}/100</span>
                  </div>
                  <p className="text-[10px] font-league uppercase tracking-widest text-[#bbb] mb-2">
                    {card.phoneticCategory}
                  </p>
                  <p className="text-xs font-league text-[#666] leading-relaxed line-clamp-3">
                    {card.linguisticCause}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {!insightsLoading && focusCards.length === 0 && stats && stats.phonemesFixed < 3 && (
            <p className="text-sm font-league text-[#aaa]">
              Complete a few more sessions to unlock your personalized phoneme analysis.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
