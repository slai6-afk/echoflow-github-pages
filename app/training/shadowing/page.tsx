"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ImmersiveShadowingPlayer, { Segment } from "@/components/training/ImmersiveShadowingPlayer";
import { getYoutubeClips } from "@/lib/api";

interface VideoClip {
  id: string;
  title: string;
  description: string;
  segments: Segment[];
  error?: string;
}

interface CompletionStats {
  sentences: number;
  avgScore: number;
}

const SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

// ─── Daily lock helpers ────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isCompletedToday(videoId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(`echoflow_shadow_${videoId}`) === todayKey();
}

function markCompletedToday(videoId: string) {
  localStorage.setItem(`echoflow_shadow_${videoId}`, todayKey());
}

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  const hours = Math.ceil((d.getTime() - Date.now()) / 3600000);
  return hours <= 1 ? "less than 1 hour" : `~${hours} hours`;
}

// ─── Fallback segments ─────────────────────────────────────────────────────────

const FALLBACK_CLIPS: VideoClip[] = [
  {
    id: "YUbSpI0J9aQ",
    title: "UX Design Talk · Speaker 1",
    description: "Clear professional delivery for design and product teams",
    segments: [
      { text: "Good design is actually a lot harder to notice than poor design.", start: 35, end: 41 },
      { text: "The best interfaces are the ones that get out of the way.", start: 42, end: 47 },
      { text: "Design is not just what it looks like — design is how it works.", start: 48, end: 54 },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageState = "picker" | "playing" | "completed";

export default function ShadowingPage() {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selected, setSelected] = useState<VideoClip | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>("picker");
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getYoutubeClips()
      .then((data: VideoClip[]) => {
        const valid = data.filter((c) => (c.segments?.length ?? 0) > 0);
        setClips(valid.length > 0 ? valid : FALLBACK_CLIPS);
        // Build lock map after clips load
        const map: Record<string, boolean> = {};
        valid.forEach((c) => { map[c.id] = isCompletedToday(c.id); });
        setLockedMap(map);
      })
      .catch(() => {
        setClips(FALLBACK_CLIPS);
        const map: Record<string, boolean> = {};
        FALLBACK_CLIPS.forEach((c) => { map[c.id] = isCompletedToday(c.id); });
        setLockedMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (clip: VideoClip) => {
    if (lockedMap[clip.id]) return; // locked — do nothing (UI shows the lock)
    setSelected(clip);
    setPageState("playing");
  };

  const handleComplete = (stats: CompletionStats) => {
    if (selected) markCompletedToday(selected.id);
    setCompletionStats(stats);
    setPageState("completed");
  };

  const handleBackToPicker = () => {
    setSelected(null);
    setPageState("picker");
    // Refresh lock map
    const map: Record<string, boolean> = {};
    clips.forEach((c) => { map[c.id] = isCompletedToday(c.id); });
    setLockedMap(map);
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "#2d6a4f" : s >= 65 ? "#f4a261" : "#e63946";

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b-2 border-foreground">
        <Link href="/dashboard" className="font-anta text-xl text-foreground">
          EchoFlow
        </Link>
        <span className="text-xs text-muted font-league uppercase tracking-widest">
          Flow State Shadowing
        </span>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
        <AnimatePresence mode="wait">

          {/* ── Video picker ── */}
          {pageState === "picker" && (
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={SPRING}
              className="flex flex-col gap-6"
            >
              <div>
                <p className="text-xs text-muted uppercase tracking-widest font-league mb-1">
                  Choose a speaker
                </p>
                <h2 className="font-anta text-5xl text-foreground">Flow State</h2>
                <p className="text-muted font-league text-sm mt-2 leading-relaxed max-w-md">
                  The system plays one sentence — then you shadow it. Score &gt;90 shows only
                  weak words. Score &lt;90 shows full breakdown. Each set unlocks once per day.
                </p>
              </div>

              {/* How it works */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { shape: "circle", color: "#1D3557", label: "Listen" },
                  { shape: "rect",   color: "#E63946", label: "Shadow" },
                  { shape: "tri",    color: "#F4A261", label: "Score" },
                ].map((s) => (
                  <div key={s.label} className="border border-border p-4 flex flex-col items-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      {s.shape === "circle" && <circle cx="12" cy="12" r="12" fill={s.color} />}
                      {s.shape === "rect"   && <rect width="24" height="24" fill={s.color} />}
                      {s.shape === "tri"    && <polygon points="12,0 24,24 0,24" fill={s.color} />}
                    </svg>
                    <span className="text-xs font-league uppercase tracking-widest text-muted">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex gap-2 items-center py-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-foreground"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                  <span className="text-sm text-muted font-league ml-2">
                    Fetching transcripts…
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {clips.map((clip) => {
                    const locked = lockedMap[clip.id] ?? false;
                    return (
                      <button
                        key={clip.id}
                        onClick={() => handleSelect(clip)}
                        disabled={locked}
                        className={`text-left border-2 p-5 transition-all group ${
                          locked
                            ? "border-border opacity-50 cursor-not-allowed"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className={`font-league font-bold transition-colors ${
                              locked ? "text-muted" : "text-foreground group-hover:text-bauhaus-blue"
                            }`}>
                              {clip.title}
                            </p>
                            <p className="text-xs text-muted font-league mt-0.5">
                              {clip.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
                            {locked ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted font-league">
                                  Unlocks in {tomorrowLabel()}
                                </span>
                                <div className="w-5 h-5 border border-border flex items-center justify-center">
                                  <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="text-muted">
                                    <rect x="1" y="4" width="6" height="6" rx="0.5" />
                                    <path d="M2 4V3a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs text-muted font-league">
                                  {clip.segments.length} sentences
                                </span>
                                <div className="w-5 h-5 bg-foreground flex items-center justify-center">
                                  <svg width="8" height="10" viewBox="0 0 8 10">
                                    <polygon points="0,0 8,5 0,10" fill="white" />
                                  </svg>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Active player ── */}
          {pageState === "playing" && selected && (
            <motion.div
              key="player"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={SPRING}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest font-league">
                    Now shadowing
                  </p>
                  <h3 className="font-anta text-2xl text-foreground">
                    {selected.title}
                  </h3>
                </div>
                <button
                  onClick={handleBackToPicker}
                  className="text-xs text-muted font-league hover:text-foreground transition-colors border border-border px-3 py-1.5"
                >
                  ← Change video
                </button>
              </div>

              <ImmersiveShadowingPlayer
                videoId={selected.id}
                segments={selected.segments}
                onComplete={handleComplete}
              />
            </motion.div>
          )}

          {/* ── Completion screen ── */}
          {pageState === "completed" && completionStats && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="flex flex-col items-center gap-10 py-12"
            >
              {/* Big score */}
              <div className="text-center">
                <p className="text-xs text-muted uppercase tracking-widest font-league mb-3">
                  Session complete
                </p>
                <div
                  className="font-anta text-8xl leading-none"
                  style={{ color: scoreColor(completionStats.avgScore) }}
                >
                  {completionStats.avgScore}
                </div>
                <p className="text-sm font-league text-muted mt-3">
                  {completionStats.sentences} sentences shadowed today
                </p>
              </div>

              {/* Grade label */}
              <div
                className="px-6 py-3 border-2 font-league font-semibold text-sm"
                style={{
                  borderColor: scoreColor(completionStats.avgScore),
                  color: scoreColor(completionStats.avgScore),
                }}
              >
                {completionStats.avgScore >= 85
                  ? "Excellent — your liaison and prosody are strong"
                  : completionStats.avgScore >= 70
                    ? "Good progress — keep focusing on connected speech"
                    : "Keep going — repetition is the key to fluency"}
              </div>

              {/* Lock notice */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 border-2 border-border flex items-center justify-center">
                  <svg width="14" height="18" viewBox="0 0 14 18" fill="none" className="text-muted">
                    <rect x="1" y="8" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
                <div>
                  <p className="font-league font-semibold text-foreground">
                    See you tomorrow
                  </p>
                  <p className="text-sm font-league text-muted mt-1 leading-relaxed max-w-xs">
                    This set unlocks in {tomorrowLabel()}.
                    Your next session will include fresh sentences.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleBackToPicker}
                  className="text-xs font-league border border-border px-5 py-3 hover:border-foreground hover:text-foreground transition-colors"
                >
                  ← Other videos
                </button>
                <Link
                  href="/dashboard"
                  className="btn-bauhaus px-8 py-3 text-sm"
                >
                  Back to Dashboard →
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
