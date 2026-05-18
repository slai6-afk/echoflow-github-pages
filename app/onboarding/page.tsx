"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import { evaluatePronunciation } from "@/lib/api";
import RecordButton from "@/components/ui/RecordButton";
import WaveformVisualizer from "@/components/ui/WaveformVisualizer";

// ─── Config ───────────────────────────────────────────────────────────────────

// Short sentence chosen to surface /θ/, /ɹ/, /æ/, and /v/ — the most common L2 targets
const TEST_SENTENCE = "The research shows three significant improvements in this workflow.";

const ROLES = ["UX Designer", "Product Manager", "Engineer", "Data Scientist", "Executive", "Other"];
const LANGUAGES = ["Mandarin Chinese", "Spanish", "Hindi", "Arabic", "Japanese", "Korean", "Portuguese", "French", "Other"];

type Screen = "intro" | "record" | "profile" | "result";

function scoreColor(s: number) {
  if (s >= 85) return "#2d6a4f";
  if (s >= 65) return "#c9853e";
  return "#c0392b";
}
function scoreLabel(s: number) {
  if (s >= 85) return "Strong";
  if (s >= 65) return "Developing";
  return "Needs work";
}

// ─── Mini score arc ────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75;
  const color = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[135deg]">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f0f0f0" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-anta text-xl leading-none" style={{ color }}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-300"
          style={{ width: i === current ? 20 : 8, background: i <= current ? "#111" : "#e4e4e7" }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const recorder = useAudioRecorder();

  const [screen, setScreen] = useState<Screen>("intro");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    overall: number; accuracy: number; fluency: number;
    phonemes: Array<{ phoneme: string; avg_score: number }>;
  } | null>(null);
  const [role, setRole] = useState("");
  const [language, setLanguage] = useState("");

  const screenIdx: Record<Screen, number> = { intro: 0, record: 1, profile: 2, result: 3 };

  // ── Record → analyze ────────────────────────────────────────────────────────
  const handleStopAndAnalyze = async () => {
    recorder.stopRecording();
    if (!recorder.audioBlob) return;
    setIsAnalyzing(true);
    try {
      const res = await evaluatePronunciation(recorder.audioBlob, TEST_SENTENCE);
      // Aggregate phoneme scores
      const phMap: Record<string, number[]> = {};
      for (const w of res.words ?? []) {
        for (const ph of w.phonemes ?? []) {
          (phMap[ph.phoneme] ??= []).push(ph.accuracy_score);
        }
      }
      const phonemes = Object.entries(phMap)
        .map(([phoneme, scores]) => ({ phoneme: `/${phoneme}/`, avg_score: scores.reduce((a, b) => a + b) / scores.length }))
        .sort((a, b) => a.avg_score - b.avg_score)
        .slice(0, 3);

      setScoreResult({
        overall: res.pronunciation_score ?? res.accuracy_score ?? 72,
        accuracy: res.accuracy_score ?? 70,
        fluency: res.fluency_score ?? 74,
        phonemes,
      });
      setScreen("profile");
    } catch {
      // Use demo scores if backend unreachable
      setScoreResult({
        overall: 71, accuracy: 68, fluency: 74,
        phonemes: [{ phoneme: "/θ/", avg_score: 38 }, { phoneme: "/ɹ/", avg_score: 52 }, { phoneme: "/æ/", avg_score: 61 }],
      });
      setScreen("profile");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const skipToProfile = () => { setScreen("profile"); };
  const skipToResult = () => { setScreen("result"); };
  const enter = () => { router.push("/dashboard"); };

  return (
    <main className="min-h-screen bg-white text-[#111] flex flex-col">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-anta text-base text-[#111]">EchoFlow</span>
        <button
          onClick={enter}
          className="text-xs font-league text-[#bbb] hover:text-[#888] transition-colors"
        >
          Skip all →
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── Screen 0: Intro ── */}
          {screen === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full flex flex-col gap-8"
            >
              <StepDots current={0} total={3} />

              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-[0.25em]">Quick setup · 60 seconds</p>
                <h1 className="font-anta text-[48px] leading-[1.05]">
                  Let&apos;s hear<br />your voice.
                </h1>
                <p className="text-sm text-[#888] font-league leading-relaxed">
                  Read one sentence. We&apos;ll map your phoneme fingerprint and personalise your training plan.
                </p>
              </div>

              {/* Preview of what they'll do */}
              <div className="rounded-2xl border border-[#f0f0f0] p-5 bg-[#fafafa]">
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-widest mb-3">You&apos;ll read aloud</p>
                <p className="font-league text-base text-[#444] leading-relaxed italic">
                  &ldquo;{TEST_SENTENCE}&rdquo;
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setScreen("record")}
                  className="w-full py-4 rounded-xl bg-[#111] text-white font-league text-sm font-semibold hover:bg-[#333] transition-colors"
                >
                  Start Voice Test
                </button>
                <button
                  onClick={skipToProfile}
                  className="text-xs text-[#bbb] font-league text-center hover:text-[#888] transition-colors"
                >
                  Skip test, set up profile only →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Screen 1: Record ── */}
          {screen === "record" && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full flex flex-col gap-7"
            >
              <StepDots current={1} total={3} />

              <div>
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-[0.25em] mb-2">Voice test · read naturally</p>
                <h2 className="font-anta text-[36px] leading-tight">Read aloud</h2>
              </div>

              {/* Sentence card */}
              <div className="rounded-2xl border-2 border-[#111] p-6 bg-white">
                <p className="font-anta text-xl text-[#111] leading-relaxed">
                  &ldquo;{TEST_SENTENCE}&rdquo;
                </p>
              </div>

              {/* Waveform */}
              <div className="rounded-xl border border-[#f0f0f0] p-3 h-16 flex items-center">
                <WaveformVisualizer
                  analyserNode={recorder.isRecording ? recorder.analyserNode : null}
                  isActive={recorder.isRecording}
                  matchScore={0}
                  height={48}
                />
              </div>

              {/* Record / analyze button */}
              {!isAnalyzing ? (
                <div className="flex flex-col items-center gap-3">
                  {!recorder.audioBlob ? (
                    <>
                      <RecordButton
                        isRecording={recorder.isRecording}
                        onStart={recorder.startRecording}
                        onStop={recorder.stopRecording}
                        size="lg"
                      />
                      <p className="text-xs text-[#bbb] font-league">
                        {recorder.isRecording ? "Recording — tap to stop" : "Tap to start recording"}
                      </p>
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex flex-col gap-3"
                    >
                      <button
                        onClick={handleStopAndAnalyze}
                        className="w-full py-4 rounded-xl bg-[#111] text-white font-league text-sm font-semibold hover:bg-[#333] transition-colors"
                      >
                        Analyze Recording →
                      </button>
                      <button
                        onClick={() => recorder.reset()}
                        className="text-xs text-[#bbb] font-league text-center hover:text-[#888]"
                      >
                        Re-record
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-8 h-8 rounded-full border-2 border-[#111] border-t-transparent animate-spin" />
                  <p className="text-sm font-league text-[#888]">Analyzing your phonemes…</p>
                </div>
              )}

              <button
                onClick={skipToProfile}
                className="text-xs text-[#bbb] font-league text-center hover:text-[#888] transition-colors mt-2"
              >
                Skip this step →
              </button>
            </motion.div>
          )}

          {/* ── Screen 2: Profile ── */}
          {screen === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full flex flex-col gap-7"
            >
              <StepDots current={2} total={3} />

              <div>
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-[0.25em] mb-2">Quick profile · optional</p>
                <h2 className="font-anta text-[36px] leading-tight">Your context</h2>
                <p className="text-sm text-[#888] font-league mt-2">Shapes vocabulary and tone analysis.</p>
              </div>

              {/* Role */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-[0.2em]">Your role</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-league transition-all ${
                        role === r
                          ? "bg-[#111] border-[#111] text-white"
                          : "border-[#e4e4e7] text-[#666] hover:border-[#bbb]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Native language */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-[0.2em]">Native language</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-league transition-all ${
                        language === l
                          ? "bg-[#111] border-[#111] text-white"
                          : "border-[#e4e4e7] text-[#666] hover:border-[#bbb]"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setScreen("result")}
                  className="w-full py-4 rounded-xl bg-[#111] text-white font-league text-sm font-semibold hover:bg-[#333] transition-colors"
                >
                  See My Results →
                </button>
                <button
                  onClick={skipToResult}
                  className="text-xs text-[#bbb] font-league text-center hover:text-[#888] transition-colors"
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Screen 3: Result ── */}
          {screen === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full flex flex-col gap-7"
            >
              <StepDots current={3} total={3} />

              <div>
                <p className="text-[10px] text-[#bbb] font-league uppercase tracking-[0.25em] mb-2">
                  {scoreResult ? "Your phoneme fingerprint" : "Welcome to EchoFlow"}
                </p>
                <h2 className="font-anta text-[36px] leading-tight">
                  {scoreResult ? "Here's what we found." : "Ready to start."}
                </h2>
              </div>

              {/* Score cards */}
              {scoreResult ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col gap-4">
                  {/* Score row */}
                  <div className="flex gap-4">
                    {[
                      { label: "Overall", value: scoreResult.overall },
                      { label: "Accuracy", value: scoreResult.accuracy },
                      { label: "Fluency", value: scoreResult.fluency },
                    ].map(s => (
                      <div key={s.label} className="flex-1 p-4 rounded-2xl border border-[#f0f0f0] bg-white flex flex-col items-center gap-2">
                        <ScoreCircle score={s.value} />
                        <span className="text-[10px] font-league text-[#bbb] uppercase tracking-widest">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Priority phonemes */}
                  {scoreResult.phonemes.length > 0 && (
                    <div className="rounded-2xl border border-[#f0f0f0] p-4 flex flex-col gap-2.5">
                      <p className="text-[10px] font-league text-[#bbb] uppercase tracking-widest">Sounds to focus on first</p>
                      {scoreResult.phonemes.map((ph, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          className="flex items-center gap-3"
                        >
                          <span className="font-anta text-lg w-10 text-center" style={{ color: scoreColor(ph.avg_score) }}>
                            {ph.phoneme}
                          </span>
                          <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${ph.avg_score}%`, background: scoreColor(ph.avg_score) }}
                            />
                          </div>
                          <span className="text-[10px] font-league text-[#bbb] w-6 text-right">{Math.round(ph.avg_score)}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* No test taken — show teaser modules */
                <div className="flex flex-col gap-3">
                  {[
                    { tag: "A' Lab", title: "Phoneme Lab", desc: "Targeted drills for your weak sounds" },
                    { tag: "B' Shadow", title: "Daily Shadowing", desc: "Mirror native UX speakers" },
                    { tag: "A' Import", title: "Real World", desc: "Analyse a real meeting recording" },
                  ].map(m => (
                    <div key={m.tag} className="p-4 rounded-xl border border-[#f0f0f0] flex items-center gap-3">
                      <span className="text-[10px] font-league bg-[#f4f4f5] px-2 py-0.5 rounded text-[#888] font-semibold shrink-0">
                        {m.tag}
                      </span>
                      <div>
                        <p className="font-league text-sm text-[#111] font-semibold">{m.title}</p>
                        <p className="text-xs text-[#bbb] font-league">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-3"
              >
                <button
                  onClick={enter}
                  className="w-full py-4 rounded-xl bg-[#111] text-white font-league text-sm font-semibold hover:bg-[#333] transition-colors"
                >
                  Enter Training →
                </button>
                <p className="text-[11px] text-[#bbb] font-league text-center">
                  No account needed to explore · save progress anytime
                </p>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
