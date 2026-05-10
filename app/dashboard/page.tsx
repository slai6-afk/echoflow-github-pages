"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import FocusRing from "@/components/ui/FocusRing";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase-browser";
import {
  aggregateFromSupabaseErrors,
  generateLinguisticInsights,
  type FocusAreaCard,
  type StoredPhonemeError,
} from "@/lib/phonemeAnalysis";

const modules = [
  {
    href: "/training/phoneme",
    icon: "◈",
    title: "Phoneme Lab",
    subtitle: "Bottom 3 drills",
    tag: "Priority",
    tagColor: "text-bauhaus-red",
  },
  {
    href: "/training/shadowing",
    icon: "◉",
    title: "Daily Shadowing",
    subtitle: "YouTube · choose a speaker",
    tag: "New",
    tagColor: "text-bauhaus-blue-light",
  },
  {
    href: "/training/import",
    icon: "◎",
    title: "Real World",
    subtitle: "Upload a meeting recording",
    tag: "",
    tagColor: "",
  },
];

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
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  // streak only counts if most recent day is today or yesterday
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  return streak;
}

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

      // Only generate insights if user has meaningful error data
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

  const statRows = stats
    ? [
        { label: "Sessions", value: stats.sessions.toString() },
        { label: "Streak", value: stats.streak ? `${stats.streak}d` : "—" },
        { label: "Phonemes Tracked", value: stats.phonemesFixed.toString() },
        { label: "Avg. Score", value: stats.avgScore !== null ? stats.avgScore.toString() : "—" },
      ]
    : Array(4).fill({ label: "…", value: "…" });

  const overallScore = stats?.avgScore ?? 0;
  const isNewUser = stats?.sessions === 0;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <Link href="/" className="font-anta text-xl text-foreground">
          EchoFlow
        </Link>
        <nav className="flex items-center gap-6">
          {["phoneme", "shadowing", "import"].map((slug, i) => (
            <Link
              key={slug}
              href={`/training/${slug}`}
              className="text-xs text-muted hover:text-foreground font-league uppercase tracking-widest transition-colors"
            >
              {["Lab", "Shadow", "Import"][i]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-league mb-1">
              {isNewUser && !statsLoading ? "Welcome" : "Good morning"}
            </p>
            <h1 className="font-anta text-5xl text-foreground">
              {isNewUser && !statsLoading ? "Let's Begin" : "Your Flow"}
            </h1>
          </div>
          {!isNewUser && (
            <FocusRing score={overallScore} size={110} label="Overall" />
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-4"
        >
          {statRows.map((s, i) => (
            <div key={i} className="glass p-4 flex flex-col items-center gap-1">
              <span className={`font-anta text-2xl text-foreground ${statsLoading ? "opacity-30" : ""}`}>
                {statsLoading ? "·" : s.value}
              </span>
              <span className="text-xs text-muted font-league uppercase tracking-wider">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* New user prompt */}
        {isNewUser && !statsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass p-5 border-l-4 border-bauhaus-yellow"
          >
            <p className="text-xs font-league text-muted uppercase tracking-widest mb-1">
              Get started
            </p>
            <p className="text-sm font-league text-foreground leading-relaxed">
              No sessions yet. Start with the Phoneme Lab or pick a shadowing video — your scores will appear here after your first session.
            </p>
          </motion.div>
        )}

        {/* Modules */}
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted uppercase tracking-widest font-league">
            Today&apos;s Focus
          </p>
          {modules.map((m, i) => (
            <motion.div
              key={m.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Link
                href={m.href}
                className="glass p-6 flex items-center gap-6 hover:border-bauhaus-blue border-2 border-border transition-all group block"
              >
                <span className="text-3xl text-bauhaus-blue-light">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-league font-semibold text-foreground">
                      {m.title}
                    </span>
                    {m.tag && (
                      <span className={`text-xs font-league uppercase tracking-wider ${m.tagColor}`}>
                        · {m.tag}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted font-league">{m.subtitle}</span>
                </div>
                <svg
                  className="w-5 h-5 text-muted group-hover:text-foreground transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Priority Focus Areas — real phoneme insights */}
        {!isNewUser && !statsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-4"
          >
            <p className="text-xs text-muted uppercase tracking-widest font-league">
              Priority Focus Areas
            </p>

            {insightsLoading && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="glass p-4 flex items-start gap-4 animate-pulse">
                    <div className="w-12 h-8 bg-border" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-3 bg-border w-1/3" />
                      <div className="h-3 bg-border w-full" />
                      <div className="h-3 bg-border w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!insightsLoading && focusCards.length > 0 && (
              <div className="flex flex-col gap-3">
                {focusCards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 + i * 0.1 }}
                    className="glass p-4 flex items-start gap-4"
                  >
                    <div className="flex flex-col items-center min-w-[3rem]">
                      <span className="font-anta text-2xl text-bauhaus-blue-light leading-none">
                        {card.phonemeSymbol}
                      </span>
                      <span className="text-xs text-muted font-league mt-1">
                        {card.avgScore}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-league uppercase tracking-widest text-bauhaus-yellow">
                          {card.phoneticCategory}
                        </span>
                        {card.substitution && (
                          <span className="text-xs font-league text-bauhaus-red">
                            {card.substitution}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-league text-muted leading-relaxed">
                        {card.linguisticCause}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!insightsLoading && focusCards.length === 0 && stats && stats.phonemesFixed < 3 && (
              <div className="glass p-4 border-l-4 border-bauhaus-yellow">
                <p className="text-sm font-league text-muted leading-relaxed">
                  Complete a few more sessions to unlock your personalized phoneme analysis.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
