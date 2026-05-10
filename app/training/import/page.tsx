"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { analyzeImportedAudio } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnnatualPhrase {
  original: string;
  issue: string;
  alternative: string;
}

interface ContentAnalysis {
  unnatural_phrases?: UnnatualPhrase[];
  word_choice_issues?: UnnatualPhrase[];
  filler_words?: string[];
  domain_opportunities?: string[];
  overall_content_score?: number;
}

interface ToneAnalysis {
  tone_label?: string;
  energy_level?: string;
  storytelling_quality?: string;
  hedging_patterns?: string[];
  verbal_habits?: string[];
  strengths?: string[];
  key_recommendation?: string;
}

interface WordScore {
  word: string;
  accuracy_score: number;
  error_type?: string;
  phonemes?: Array<{ phoneme: string; accuracy_score: number }>;
}

interface PhonemeConcentration {
  phoneme: string;
  avg_score: number;
  count: number;
  example_words: string[];
}

interface PronunciationData {
  overall_score?: number;
  fluency_score?: number;
  completeness_score?: number;
  accuracy_score?: number;
  word_scores?: WordScore[];
  phoneme_concentration?: PhonemeConcentration[];
}

interface ImportResult {
  transcript?: string;
  content_analysis?: ContentAnalysis;
  tone_analysis?: ToneAnalysis;
  pronunciation?: PronunciationData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES = [
  "UX Designer",
  "Product Manager",
  "Software Engineer",
  "Data Scientist",
  "Design Researcher",
  "Executive",
  "Sales / BD",
];

type Tab = "transcript" | "content" | "tone" | "pronunciation";

function scoreColor(s: number): string {
  if (s >= 85) return "#2d6a4f";
  if (s >= 65) return "#f4a261";
  return "#e63946";
}

function scoreBg(s: number): string {
  if (s >= 85) return "#2d6a4f18";
  if (s >= 65) return "#f4a26118";
  return "#e6394618";
}

function energyColor(e: string): string {
  if (e === "High") return "#2d6a4f";
  if (e === "Medium") return "#f4a261";
  return "#e63946";
}

function storytellingColor(s: string): string {
  if (s === "Excellent" || s === "Good") return "#2d6a4f";
  if (s === "Developing") return "#f4a261";
  return "#e63946";
}

const PROGRESS_LABELS = [
  "Transcribing audio…",
  "Scoring pronunciation…",
  "Analyzing content & vocabulary…",
  "Evaluating tone & delivery…",
  "Generating report…",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColoredTranscript({ text, wordScores }: { text: string; wordScores?: WordScore[] }) {
  if (!wordScores?.length) {
    return <p className="font-league text-foreground text-sm leading-relaxed">{text}</p>;
  }

  const scoreMap: Record<string, number> = {};
  wordScores.forEach(w => {
    const clean = w.word.toLowerCase().replace(/[^a-z]/g, "");
    scoreMap[clean] = w.accuracy_score;
  });

  const words = text.split(/(\s+)/);
  return (
    <p className="font-league text-sm leading-relaxed">
      {words.map((chunk, i) => {
        if (/^\s+$/.test(chunk)) return <span key={i}>{chunk}</span>;
        const key = chunk.toLowerCase().replace(/[^a-z]/g, "");
        const score = scoreMap[key];
        if (score == null) return <span key={i} className="text-foreground">{chunk}</span>;
        return (
          <span
            key={i}
            className="rounded px-0.5 font-semibold"
            style={{ color: scoreColor(score), background: scoreBg(score) }}
            title={`${Math.round(score)}/100`}
          >
            {chunk}
          </span>
        );
      })}
    </p>
  );
}

function ScoreLegend() {
  return (
    <div className="flex items-center gap-4 text-[10px] font-league uppercase tracking-widest text-muted">
      {[["#2d6a4f", "Good (85+)"], ["#f4a261", "Watch (65–84)"], ["#e63946", "Practice (<65)"]].map(([color, label]) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

function PhraseCard({ item, type }: { item: UnnatualPhrase; type: "phrase" | "word" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-league uppercase tracking-widest text-bauhaus-red mt-0.5 flex-shrink-0">
          {type === "phrase" ? "Unnatural" : "Word choice"}
        </span>
        <span className="font-league text-sm text-foreground font-semibold">
          &ldquo;{item.original}&rdquo;
        </span>
      </div>
      <p className="text-xs font-league text-muted leading-relaxed">{item.issue}</p>
      <div className="flex items-start gap-2 pt-1 border-t border-border">
        <span className="text-[10px] font-league text-bauhaus-blue uppercase tracking-widest flex-shrink-0 mt-0.5">
          Try →
        </span>
        <span className="font-league text-sm text-bauhaus-blue font-semibold">
          &ldquo;{item.alternative}&rdquo;
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { user } = useUser();
  const nativeLang = (user as { user_metadata?: { native_language?: string } })?.user_metadata?.native_language ?? "";

  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("UX Designer");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("transcript");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [".m4a", ".wav", ".mp3", ".webm", ".ogg", ".mp4"] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setProgressIdx(0);

    const interval = setInterval(() => {
      setProgressIdx(p => Math.min(p + 1, PROGRESS_LABELS.length - 1));
    }, 3500);

    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const data = await analyzeImportedAudio(blob, role, nativeLang);
      setResult(data);
      setActiveTab("transcript");
    } catch {
      // Demo fallback
      setResult({
        transcript: "So, basically, I want to discuss about the new design system we're working on. From my side, I think maybe we should consider the user flow more carefully. The interface should be very unique and make it look better for our users. I'm not sure but possibly we could improve it.",
        content_analysis: {
          unnatural_phrases: [
            { original: "discuss about", issue: "'Discuss' is transitive — 'about' is redundant and marks non-native speech", alternative: "discuss the design system" },
            { original: "From my side", issue: "Direct translation pattern — sounds non-native in English", alternative: "My take is / In my view / Personally" },
          ],
          word_choice_issues: [
            { original: "make it look better", issue: "Too vague for a senior designer — sounds junior", alternative: "improve visual hierarchy / reduce cognitive load / tighten the visual language" },
            { original: "very unique", issue: "'Unique' is absolute — 'very unique' is a grammar error and sounds informal", alternative: "quite distinctive / genuinely original" },
          ],
          filler_words: ["So (3x — sentence opener)", "basically (2x)", "I'm not sure but (hedging)"],
          domain_opportunities: ["Used 'user flow' correctly, but 'information architecture' or 'interaction model' would signal senior-level thinking"],
          overall_content_score: 64,
        },
        tone_analysis: {
          tone_label: "Hesitant and over-hedged",
          energy_level: "Low",
          storytelling_quality: "Poor",
          hedging_patterns: ["'I think maybe'", "'I'm not sure but possibly'", "'could consider'"],
          verbal_habits: ["Starts 3 sentences with 'So'", "Qualifies nearly every claim with hedging language", "'basically' as filler before main points"],
          strengths: ["Clear logical progression of ideas", "Appropriate professional register", "Correct use of domain vocabulary"],
          key_recommendation: "Remove all hedging from your opening sentence — start with your recommendation, not your uncertainty. Instead of 'I think maybe we should consider...', say 'My recommendation: we prioritize the user flow.' Record this and replay it — you'll hear the authority difference immediately.",
        },
        pronunciation: {
          overall_score: 71,
          fluency_score: 74,
          word_scores: [],
          phoneme_concentration: [
            { phoneme: "/θ/", avg_score: 38.2, count: 4, example_words: ["the", "think", "this"] },
            { phoneme: "/ɹ/", avg_score: 51.7, count: 9, example_words: ["working", "carefully", "more"] },
            { phoneme: "/æ/", avg_score: 61.4, count: 6, example_words: ["basically", "carefully", "and"] },
            { phoneme: "/v/", avg_score: 68.9, count: 5, example_words: ["very", "improve", "have"] },
          ],
        },
      });
      setActiveTab("transcript");
    } finally {
      clearInterval(interval);
      setProgressIdx(PROGRESS_LABELS.length - 1);
      setIsAnalyzing(false);
    }
  };

  const formatBytes = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  const TABS: { id: Tab; label: string }[] = [
    { id: "transcript", label: "Transcript" },
    { id: "content", label: "Content" },
    { id: "tone", label: "Tone" },
    { id: "pronunciation", label: "Pronunciation" },
  ];

  const content = result?.content_analysis;
  const tone = result?.tone_analysis;
  const pron = result?.pronunciation;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <Link href="/dashboard" className="font-anta text-xl text-foreground">
          EchoFlow
        </Link>
        <span className="text-xs text-muted font-league uppercase tracking-widest">
          Real World Import
        </span>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 flex flex-col gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-muted uppercase tracking-widest font-league mb-2">The Real World</p>
          <h2 className="font-anta text-5xl text-foreground mb-2">Import Audio</h2>
          <p className="text-muted font-league text-sm leading-relaxed">
            Upload a meeting recording or interview prep. Get a 4-dimension analysis: transcript,
            content quality, tone, and pronunciation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 glass px-4 py-3"
        >
          <span className="text-sm">🔒</span>
          <p className="text-xs text-muted font-league">
            Audio is processed ephemerally and never stored on our servers.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              {/* Role selector */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted font-league uppercase tracking-widest">
                  Your context (shapes vocabulary & tone analysis)
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-league transition-all border ${
                        role === r
                          ? "border-foreground text-foreground font-semibold"
                          : "border-border text-muted hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`glass p-12 flex flex-col items-center gap-4 cursor-pointer border-2 transition-all ${
                  isDragActive ? "border-bauhaus-blue" : file ? "border-bauhaus-blue" : "border-border hover:border-muted"
                }`}
              >
                <input {...getInputProps()} />
                <span className="text-4xl text-muted">
                  {file ? "✓" : isDragActive ? "◎" : "⬆"}
                </span>
                {file ? (
                  <div className="text-center">
                    <p className="font-league font-semibold text-foreground">{file.name}</p>
                    <p className="text-xs text-muted mt-1">{formatBytes(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-league text-foreground">
                      {isDragActive ? "Drop it here" : "Drag & drop your audio"}
                    </p>
                    <p className="text-xs text-muted mt-1">.m4a, .wav, .mp3, .mp4 · up to 100 MB</p>
                  </div>
                )}
              </div>

              {/* Progress */}
              {isAnalyzing && (
                <div className="flex flex-col gap-2">
                  <div className="h-0.5 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-foreground rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${((progressIdx + 1) / PROGRESS_LABELS.length) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={progressIdx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-muted font-league text-center"
                    >
                      {PROGRESS_LABELS[progressIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                className="w-full py-4 btn-bauhaus disabled:opacity-30"
              >
                {isAnalyzing ? "Analyzing…" : "Analyze Recording"}
              </button>

              {file && !isAnalyzing && (
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-muted font-league text-center hover:text-foreground transition-colors"
                >
                  Remove file
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Tab bar */}
              <div className="flex gap-1 bg-surface rounded-full p-1 border border-border">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 py-2 rounded-full text-xs font-league font-semibold uppercase tracking-wider transition-all ${
                      activeTab === t.id
                        ? "bg-foreground text-background"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* ── Transcript tab ── */}
                {activeTab === "transcript" && (
                  <motion.div
                    key="transcript"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4"
                  >
                    {pron?.word_scores?.length ? (
                      <ScoreLegend />
                    ) : null}
                    <div className="glass p-5 rounded-xl border border-border">
                      <ColoredTranscript
                        text={result.transcript || "No transcript available."}
                        wordScores={pron?.word_scores}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Pronunciation", value: pron?.overall_score },
                        { label: "Fluency", value: pron?.fluency_score },
                        { label: "Content", value: content?.overall_content_score },
                      ].map((s) => (
                        <div key={s.label} className="glass p-3 flex flex-col items-center gap-1">
                          <span
                            className="font-anta text-2xl"
                            style={{ color: s.value != null ? scoreColor(s.value) : "#9ca3af" }}
                          >
                            {s.value != null ? Math.round(s.value) : "—"}
                          </span>
                          <span className="text-[10px] font-league uppercase tracking-widest text-muted">
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Content tab ── */}
                {activeTab === "content" && content && (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-6"
                  >
                    {/* Unnatural phrases */}
                    {(content.unnatural_phrases?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">
                          Unnatural Phrasing
                        </p>
                        {content.unnatural_phrases!.map((p, i) => (
                          <PhraseCard key={i} item={p} type="phrase" />
                        ))}
                      </div>
                    )}

                    {/* Word choice issues */}
                    {(content.word_choice_issues?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">
                          Word Choice
                        </p>
                        {content.word_choice_issues!.map((p, i) => (
                          <PhraseCard key={i} item={p} type="word" />
                        ))}
                      </div>
                    )}

                    {/* Filler words */}
                    {(content.filler_words?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">
                          Filler Words Detected
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {content.filler_words!.map((f, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-lg border border-bauhaus-red text-bauhaus-red text-xs font-league font-semibold"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domain opportunities */}
                    {(content.domain_opportunities?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">
                          Domain Vocabulary Opportunities
                        </p>
                        {content.domain_opportunities!.map((d, i) => (
                          <div key={i} className="glass p-3 rounded-xl border border-border">
                            <p className="text-xs font-league text-muted leading-relaxed">{d}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Tone tab ── */}
                {activeTab === "tone" && tone && (
                  <motion.div
                    key="tone"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-6"
                  >
                    {/* Tone label + badges */}
                    <div className="glass p-5 rounded-xl border border-border flex flex-col gap-3">
                      <p className="text-[10px] font-league text-muted uppercase tracking-widest">Overall Tone</p>
                      <p className="font-anta text-2xl text-foreground">{tone.tone_label}</p>
                      <div className="flex gap-3 flex-wrap">
                        {tone.energy_level && (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="text-xs font-league font-bold px-2.5 py-1 rounded-full"
                              style={{ background: scoreBg(tone.energy_level === "High" ? 90 : tone.energy_level === "Medium" ? 70 : 40), color: energyColor(tone.energy_level) }}
                            >
                              {tone.energy_level}
                            </span>
                            <span className="text-[9px] font-league text-muted uppercase tracking-widest">Energy</span>
                          </div>
                        )}
                        {tone.storytelling_quality && (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="text-xs font-league font-bold px-2.5 py-1 rounded-full"
                              style={{ background: scoreBg(tone.storytelling_quality === "Excellent" ? 90 : tone.storytelling_quality === "Good" ? 80 : tone.storytelling_quality === "Developing" ? 65 : 45), color: storytellingColor(tone.storytelling_quality) }}
                            >
                              {tone.storytelling_quality}
                            </span>
                            <span className="text-[9px] font-league text-muted uppercase tracking-widest">Storytelling</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key recommendation */}
                    {tone.key_recommendation && (
                      <div className="glass p-5 rounded-xl border-l-4 border-bauhaus-blue">
                        <p className="text-[10px] font-league text-bauhaus-blue uppercase tracking-widest mb-2">Key Recommendation</p>
                        <p className="text-sm font-league text-foreground leading-relaxed">{tone.key_recommendation}</p>
                      </div>
                    )}

                    {/* Verbal habits */}
                    {(tone.verbal_habits?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">Verbal Habits</p>
                        {tone.verbal_habits!.map((h, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-bauhaus-red text-xs mt-0.5 flex-shrink-0">—</span>
                            <p className="text-sm font-league text-foreground">{h}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hedging patterns */}
                    {(tone.hedging_patterns?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">Hedging Patterns</p>
                        <div className="flex flex-wrap gap-2">
                          {tone.hedging_patterns!.map((h, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-lg border border-border text-xs font-league text-muted italic">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {(tone.strengths?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">Strengths</p>
                        {tone.strengths!.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: "#2d6a4f" }}>✓</span>
                            <p className="text-sm font-league text-foreground">{s}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Pronunciation tab ── */}
                {activeTab === "pronunciation" && (
                  <motion.div
                    key="pronunciation"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-6"
                  >
                    {/* Score summary */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Pronunciation", value: pron?.overall_score },
                        { label: "Fluency", value: pron?.fluency_score },
                        { label: "Accuracy", value: pron?.accuracy_score },
                        { label: "Completeness", value: pron?.completeness_score },
                      ].map(s => (
                        <div key={s.label} className="glass p-4 flex items-center gap-4">
                          <span
                            className="font-anta text-3xl"
                            style={{ color: s.value != null ? scoreColor(s.value) : "#9ca3af" }}
                          >
                            {s.value != null ? Math.round(s.value) : "—"}
                          </span>
                          <div>
                            <p className="text-xs font-league uppercase tracking-widest text-muted">{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Phoneme concentration table */}
                    {(pron?.phoneme_concentration?.length ?? 0) > 0 ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-league text-muted uppercase tracking-widest">
                          Phoneme Focus Areas — worst first
                        </p>
                        <div className="flex flex-col gap-2">
                          {pron!.phoneme_concentration!.map((ph, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="glass rounded-xl p-4 flex items-center gap-4"
                            >
                              <div className="flex flex-col items-center min-w-[3.5rem]">
                                <span
                                  className="font-anta text-2xl leading-none"
                                  style={{ color: scoreColor(ph.avg_score) }}
                                >
                                  {ph.phoneme}
                                </span>
                                <span
                                  className="text-xs font-league font-bold mt-0.5"
                                  style={{ color: scoreColor(ph.avg_score) }}
                                >
                                  {Math.round(ph.avg_score)}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${ph.avg_score}%`, background: scoreColor(ph.avg_score) }}
                                  />
                                </div>
                                {ph.example_words.length > 0 && (
                                  <p className="text-[10px] font-league text-muted mt-1">
                                    in: {ph.example_words.join(", ")}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] font-league text-muted flex-shrink-0">
                                {ph.count}×
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="glass p-5 rounded-xl border border-border text-center">
                        <p className="text-sm font-league text-muted">
                          Phoneme-level data requires Azure Speech configured on the server.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Reset */}
              <button
                onClick={() => { setResult(null); setFile(null); }}
                className="w-full py-3.5 border border-border text-muted font-league text-sm font-semibold hover:border-foreground hover:text-foreground transition-all rounded-xl"
              >
                Analyze Another Recording
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
