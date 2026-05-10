"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import RecordButton from "@/components/ui/RecordButton";
import WaveformVisualizer from "@/components/ui/WaveformVisualizer";
import FocusRing from "@/components/ui/FocusRing";
import PhonemeBreakdown, { WordResult } from "@/components/training/PhonemeBreakdown";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import { evaluatePronunciation, getLinguistReport } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

const REFERENCE_TEXT =
  "Global markets rose sharply this week after the Federal Reserve signaled it may hold interest rates steady through the summer. Investors welcomed the news, pushing major stock indexes to record highs. Oil prices climbed following supply cuts from leading producers, while the dollar weakened against most major currencies. Several large banks reported stronger than expected quarterly earnings, driven by higher lending income and solid consumer spending. Analysts say the outlook remains cautiously optimistic, though rising debt levels and ongoing trade tensions could weigh on growth in the months ahead. For everyday investors, financial advisors recommend staying diversified and avoiding any sudden changes to long-term plans.";

const NATIVE_LANGS = [
  "Mandarin Chinese",
  "Spanish",
  "Hindi",
  "Arabic",
  "Portuguese",
  "French",
  "Russian",
  "Japanese",
  "Korean",
  "German",
  "Other",
];

type Step = "paragraph" | "language" | "dialogue" | "report";

interface LinguistReport {
  signature_insight?: string;
  bottom_3_phonemes?: Array<{ phoneme: string; note: string }>;
  first_exercise?: string;
  overall_pattern?: string;
  fluency_observations?: string;
  raw?: string;
}

interface DialogueAnswers {
  role: string;
  context: string;
  challenge: string;
}

const DIALOGUE_QUESTIONS = [
  {
    key: "role" as const,
    question: "What's your main role?",
    options: ["Software Engineer", "Product Manager", "Data Scientist", "Designer", "Executive", "Sales / BD", "Other"],
  },
  {
    key: "context" as const,
    question: "When do you most need English?",
    options: ["Technical meetings", "Client presentations", "Job interviews", "Conference talks", "Daily standup", "Written communication"],
  },
  {
    key: "challenge" as const,
    question: "Your biggest challenge?",
    options: ["Pronunciation accuracy", "Speaking pace", "Confidence under pressure", "Being understood clearly", "Vocabulary choice"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paragraph");
  const [nativeLang, setNativeLang] = useState("");
  const [paragraphResult, setParagraphResult] = useState<Record<string, unknown> | null>(null);
  const [paragraphWords, setParagraphWords] = useState<WordResult[]>([]);
  const [paragraphAnalyzed, setParagraphAnalyzed] = useState(false);
  const [dialogueAnswers, setDialogueAnswers] = useState<Partial<DialogueAnswers>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<LinguistReport | null>(null);
  const [tooNoisy, setTooNoisy] = useState(false);
  const [apiError, setApiError] = useState("");

  const recorder = useAudioRecorder();
  const { user } = useUser();

  const stepIndex = { paragraph: 0, language: 1, dialogue: 2, report: 3 };

  // Step 1: Paragraph recording
  const handleParagraphStop = async () => {
    recorder.stopRecording();
  };

  const handleParagraphSubmit = async () => {
    if (!recorder.audioBlob) return;
    setIsAnalyzing(true);
    try {
      const result = await evaluatePronunciation(recorder.audioBlob, REFERENCE_TEXT);
      const score = result.pronunciation_score ?? result.accuracy_score ?? 0;
      if (result.error && score === 0) {
        setTooNoisy(true);
        setTimeout(() => setTooNoisy(false), 4000);
      } else {
        setParagraphResult(result);
        setParagraphWords(result.words ?? []);
        setParagraphAnalyzed(true); // show breakdown inline, don't advance yet
      }
    } catch (err) {
      console.error("Assessment failed:", err);
      setApiError("Could not reach the analysis server — make sure the backend is running.");
      setTimeout(() => setApiError(""), 6000);
    } finally {
      setIsAnalyzing(false);
      recorder.reset();
    }
  };

  // Generate final report — pass full result including words for real phoneme extraction
  const handleGenerateReport = async () => {
    setIsAnalyzing(true);
    const context = `Role: ${dialogueAnswers.role ?? "unknown"}. Context: ${dialogueAnswers.context ?? "unknown"}. Challenge: ${dialogueAnswers.challenge ?? "unknown"}.`;
    const payload = { ...(paragraphResult ?? {}), words: paragraphWords, user_context: context };
    try {
      const reportData = await getLinguistReport(payload, nativeLang);
      setReport(reportData);
      setStep("report");
    } catch {
      // Fallback derives from real word data if available
      const fallbackBottom = paragraphWords.length > 0
        ? (() => {
            const scores: Record<string, number[]> = {};
            for (const w of paragraphWords) {
              for (const ph of w.phonemes ?? []) {
                (scores[ph.phoneme] ??= []).push(ph.accuracy_score);
              }
            }
            return Object.entries(scores)
              .map(([ph, arr]) => ({ phoneme: `/${ph}/`, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
              .sort((a, b) => a.avg - b.avg)
              .slice(0, 3)
              .map(({ phoneme, avg }) => ({ phoneme, note: `Avg score ${Math.round(avg)}/100 — needs focused practice` }));
          })()
        : [
            { phoneme: "/θ/", note: "Dental fricative — tongue not contacting upper teeth" },
            { phoneme: "/æ/", note: "Trap vowel — jaw not opening wide enough" },
            { phoneme: "/ɹ/", note: "Approximant — L1 interference in tongue body position" },
          ];
      setReport({
        signature_insight: "Your rhythm is confident but phoneme precision drops under cognitive load — a classic L1 prosodic mapping pattern.",
        bottom_3_phonemes: fallbackBottom,
        first_exercise: "Start with minimal pair drills on your lowest-scoring phoneme. Record, then listen back at 0.8× speed.",
        overall_pattern: "Strong fluency foundation. Fine-tuning phoneme-level precision is the next step.",
      });
      setStep("report");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <span className="font-anta text-xl text-foreground">EchoFlow</span>
        <div className="flex items-center gap-3">
          {(["paragraph", "language", "dialogue", "report"] as Step[]).map(
            (s, i) => (
              <div
                key={s}
                className={`h-1 transition-all duration-500 ${
                  stepIndex[step] >= i
                    ? "w-8 bg-bauhaus-blue"
                    : "w-4 bg-border"
                }`}
              />
            )
          )}
        </div>
      </header>

      <div className={`flex-1 flex flex-col items-center px-6 py-12 ${step === "paragraph" ? "justify-start pt-16" : "justify-center"}`}>
        <AnimatePresence mode="wait">
          {/* Step 1: Paragraph */}
          {step === "paragraph" && (
            <motion.div
              key="paragraph"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full max-w-2xl flex flex-col gap-8"
            >
              <div>
                <p className="text-xs text-muted uppercase tracking-widest mb-2">
                  Step 1 of 3 — Phonetic Coverage
                </p>
                <h2 className="font-anta text-4xl text-foreground mb-2">
                  The Paragraph
                </h2>
                <p className="text-muted font-league">
                  Read the text below naturally. We&apos;re mapping your phoneme
                  landscape.
                </p>
              </div>

              {/* Reference text */}
              <div className="glass p-6">
                <p className="text-foreground font-league text-lg leading-relaxed tracking-wide">
                  {REFERENCE_TEXT}
                </p>
              </div>

              {!paragraphAnalyzed && (
                <>
                  {/* Waveform */}
                  <div className="glass p-4">
                    <WaveformVisualizer
                      analyserNode={recorder.isRecording ? recorder.analyserNode : null}
                      isActive={recorder.isRecording}
                      matchScore={0}
                      height={64}
                    />
                  </div>

                  <AnimatePresence>
                    {tooNoisy && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass p-4 border border-warning text-warning text-sm text-center font-league"
                      >
                        Too much background noise — find a quieter space and try again.
                      </motion.div>
                    )}
                    {apiError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass p-4 border border-danger text-danger text-sm text-center font-league"
                      >
                        {apiError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {recorder.error && (
                    <p className="text-danger text-sm font-league text-center">
                      {recorder.error}
                    </p>
                  )}

                  <div className="flex flex-col items-center gap-4">
                    <RecordButton
                      isRecording={recorder.isRecording}
                      onStart={recorder.startRecording}
                      onStop={handleParagraphStop}
                      size="lg"
                    />
                    <p className="text-xs text-muted">
                      {recorder.isRecording
                        ? "Recording — tap to stop"
                        : recorder.audioBlob
                          ? "Recording complete"
                          : "Long-press or tap to begin"}
                    </p>
                  </div>
                </>
              )}

              {recorder.audioBlob && !paragraphAnalyzed && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleParagraphSubmit}
                  disabled={isAnalyzing}
                  className="w-full py-4 btn-bauhaus disabled:opacity-50"
                >
                  {isAnalyzing ? "Analyzing phonemes…" : "Analyze Recording"}
                </motion.button>
              )}

              {paragraphAnalyzed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest font-league mb-3">
                      Phoneme Breakdown
                    </p>
                    <PhonemeBreakdown words={paragraphWords} />
                  </div>
                  <button
                    onClick={() => setStep("language")}
                    className="w-full py-4 btn-bauhaus"
                  >
                    Continue →
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 1b: Language selection */}
          {step === "language" && (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full max-w-lg flex flex-col gap-8"
            >
              <div>
                <p className="text-xs text-muted uppercase tracking-widest mb-2">
                  One quick question
                </p>
                <h2 className="font-anta text-4xl text-foreground mb-2">
                  Your Native Language
                </h2>
                <p className="text-muted font-league">
                  This lets us identify L1 interference patterns with surgical precision.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {NATIVE_LANGS.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setNativeLang(lang)}
                    className={`py-3 px-4 font-league text-sm transition-all border ${
                      nativeLang === lang
                        ? "border-bauhaus-blue bg-bauhaus-blue text-white"
                        : "border-border text-muted hover:border-bauhaus-blue hover:text-foreground"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep("dialogue")}
                disabled={!nativeLang}
                className="w-full py-4 btn-bauhaus disabled:opacity-30"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step 2: Dialogue (tab selection) */}
          {step === "dialogue" && (
            <motion.div
              key="dialogue"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full max-w-2xl flex flex-col gap-8"
            >
              <div>
                <p className="text-xs text-muted uppercase tracking-widest mb-2">
                  Step 2 of 3 — Context Mapping
                </p>
                <h2 className="font-anta text-4xl text-foreground mb-1">
                  Your Profile
                </h2>
                <p className="text-muted font-league text-sm">
                  Three quick questions — we&apos;ll tailor your report to your actual communication context.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {DIALOGUE_QUESTIONS.map((q, qi) => (
                  <motion.div
                    key={q.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qi * 0.1 }}
                    className="flex flex-col gap-3"
                  >
                    <p className="font-league text-sm text-foreground font-semibold">
                      {q.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setDialogueAnswers((prev) => ({ ...prev, [q.key]: opt }))}
                          className={`px-4 py-2 font-league text-sm transition-all border ${
                            dialogueAnswers[q.key] === opt
                              ? "border-bauhaus-blue bg-bauhaus-blue text-white"
                              : "border-border text-muted hover:border-bauhaus-blue hover:text-foreground"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {dialogueAnswers.role && dialogueAnswers.context && dialogueAnswers.challenge && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleGenerateReport}
                  disabled={isAnalyzing}
                  className="w-full py-4 btn-bauhaus disabled:opacity-50"
                >
                  {isAnalyzing ? "Generating your Linguist's Report…" : "Generate My Report →"}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Step 3: Linguist's Report */}
          {step === "report" && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl flex flex-col gap-8"
            >
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-muted uppercase tracking-widest mb-3"
                >
                  The Linguist&apos;s Report
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="font-anta text-4xl text-foreground"
                >
                  Your Linguistic Fingerprint
                </motion.h2>
              </div>

              {/* Scores */}
              {paragraphResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center gap-8"
                >
                  <FocusRing
                    score={(paragraphResult.pronunciation_score as number) ?? 0}
                    size={130}
                    label="Overall"
                  />
                  <FocusRing
                    score={(paragraphResult.accuracy_score as number) ?? 0}
                    size={130}
                    label="Accuracy"
                  />
                  <FocusRing
                    score={(paragraphResult.fluency_score as number) ?? 0}
                    size={130}
                    label="Fluency"
                  />
                </motion.div>
              )}

              {/* Phoneme breakdown of the reference paragraph */}
              {paragraphWords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  <p className="text-xs text-muted uppercase tracking-widest font-league mb-2">
                    Your Paragraph — Word by Word
                  </p>
                  <PhonemeBreakdown words={paragraphWords} />
                </motion.div>
              )}

              {/* Signature insight */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass p-6 border-l-4 border-bauhaus-blue"
              >
                <p className="text-xs text-insight-blue-glow uppercase tracking-widest mb-3 font-league">
                  The Piercing Observation
                </p>
                <p className="text-foreground font-league text-base leading-relaxed">
                  {report.signature_insight}
                </p>
              </motion.div>

              {/* Bottom 3 phonemes */}
              {report.bottom_3_phonemes && report.bottom_3_phonemes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-xs text-muted uppercase tracking-widest font-league">
                    Priority Focus Areas
                  </p>
                  {report.bottom_3_phonemes.map(
                    (p, i) => (
                      <div
                        key={i}
                        className="glass p-4 flex items-start gap-4"
                      >
                        <span className="font-anta text-2xl text-insight-blue-glow min-w-[3rem] text-center">
                          {p.phoneme}
                        </span>
                        <p className="text-muted font-league text-sm leading-relaxed">
                          {p.note}
                        </p>
                      </div>
                    )
                  )}
                </motion.div>
              )}

              {/* First exercise */}
              {report.first_exercise && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="glass p-5 flex items-center gap-4"
                >
                  <span className="text-2xl">◎</span>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1 font-league">
                      Start Here
                    </p>
                    <p className="text-foreground font-league text-sm">
                      {report.first_exercise}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Auth gate: prompt login if not signed in */}
              {user ? (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-4 btn-bauhaus"
                >
                  Enter Your Training Dashboard →
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="flex flex-col gap-3"
                >
                  <div className="glass p-4 border-l-4 border-bauhaus-yellow">
                    <p className="text-xs font-league text-muted uppercase tracking-widest mb-1">
                      Save your results
                    </p>
                    <p className="text-sm font-league text-foreground leading-relaxed">
                      Sign in to save your Linguist&apos;s Report and track your progress over time.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/auth?next=/dashboard")}
                    className="w-full py-4 btn-bauhaus"
                  >
                    Sign In to Save Results →
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="text-xs text-muted font-league text-center hover:text-foreground transition-colors"
                  >
                    Skip for now — continue without saving
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
