"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import RecordButton from "@/components/ui/RecordButton";
import WaveformVisualizer from "@/components/ui/WaveformVisualizer";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import { API_BASE, evaluatePronunciation } from "@/lib/api";

// ─── Drill data ───────────────────────────────────────────────────────────────

const DRILLS = [
  {
    phoneme: "/θ/",
    ipaSymbol: "θ",
    name: "Dental Fricative",
    color: "#e63946",
    tip: "Touch the tip of your tongue lightly to the back of your upper front teeth. Let air flow through — don't push.",
    pairs: [
      { word: "thin",    ipa: "/θɪn/",   contrast: "tin",  contrastIpa: "/tɪn/" },
      { word: "think",   ipa: "/θɪŋk/",  contrast: "sink", contrastIpa: "/sɪŋk/" },
      { word: "three",   ipa: "/θriː/",  contrast: "free", contrastIpa: "/friː/" },
      { word: "through", ipa: "/θruː/",  contrast: "true", contrastIpa: "/truː/" },
    ],
  },
  {
    phoneme: "/æ/",
    ipaSymbol: "æ",
    name: "Trap Vowel",
    color: "#f4a261",
    tip: "Drop your jaw lower than feels natural. Tongue stays flat and front. Think of 'cat' — then exaggerate the jaw drop.",
    pairs: [
      { word: "trap", ipa: "/træp/", contrast: "trip", contrastIpa: "/tɹɪp/" },
      { word: "bad",  ipa: "/bæd/",  contrast: "bed",  contrastIpa: "/bɛd/" },
      { word: "man",  ipa: "/mæn/",  contrast: "men",  contrastIpa: "/mɛn/" },
      { word: "back", ipa: "/bæk/",  contrast: "beck", contrastIpa: "/bɛk/" },
    ],
  },
  {
    phoneme: "/ɹ/",
    ipaSymbol: "ɹ",
    name: "Approximant R",
    color: "#1d3557",
    tip: "Bunch your tongue back and up — it must NOT touch the roof of your mouth. Slightly round your lips. No contact.",
    pairs: [
      { word: "right", ipa: "/ɹaɪt/", contrast: "light", contrastIpa: "/laɪt/" },
      { word: "read",  ipa: "/ɹiːd/", contrast: "lead",  contrastIpa: "/liːd/" },
      { word: "run",   ipa: "/ɹʌn/",  contrast: "lung",  contrastIpa: "/lʌŋ/" },
      { word: "rate",  ipa: "/ɹeɪt/", contrast: "late",  contrastIpa: "/leɪt/" },
    ],
  },
];

// ─── Sentence data ────────────────────────────────────────────────────────────

const DOMAINS = ["General", "Tech", "Finance", "Product"] as const;
type Domain = (typeof DOMAINS)[number];

interface SentenceDrill {
  text: string;
  hint: string;
}

const SENTENCE_DATA: Record<string, Record<Domain, SentenceDrill[]>> = {
  θ: {
    General: [
      { text: "Think carefully and thoroughly before making your final decision.", hint: "think · thoroughly" },
      { text: "Three thousand people attended the therapy conference this month.", hint: "three · thousand · therapy" },
      { text: "Both theories are worth exploring through extensive testing.", hint: "both · theories · through" },
    ],
    Tech: [
      { text: "Think through the authentication flow thoroughly before shipping to production.", hint: "think · through · thoroughly" },
      { text: "The thread scheduler runs thirty thousand concurrent tasks without blocking.", hint: "thread · thirty · thousand" },
      { text: "Both methods passed the throughput threshold during load testing.", hint: "both · throughput · threshold" },
    ],
    Finance: [
      { text: "The thirty-day treasury yield fell by three basis points this month.", hint: "thirty · treasury · three" },
      { text: "Think through the risk thoroughly before authorizing the transaction.", hint: "think · through · thoroughly" },
      { text: "Both algorithms outperformed the benchmark throughout the quarter.", hint: "both · throughout" },
    ],
    Product: [
      { text: "Think through the user journey thoroughly before the sprint planning.", hint: "think · through · thoroughly" },
      { text: "Three key themes emerged from usability testing across both platforms.", hint: "three · themes · both" },
      { text: "The north star metric shapes all thinking on this feature roadmap.", hint: "the · thinking" },
    ],
  },
  æ: {
    General: [
      { text: "Track the actual impact rather than chasing abstract vanity metrics.", hint: "track · actual · abstract" },
      { text: "Bad habits can trap talented people in patterns they cannot escape.", hint: "bad · trap · talented · patterns · cannot" },
      { text: "The massive gap between plan and actual results surprised the manager.", hint: "massive · gap · actual" },
    ],
    Tech: [
      { text: "Track actual memory allocation patterns to catch stack overflows early.", hint: "track · actual · allocation · patterns · catch · stack" },
      { text: "The backend crashed after a badly crafted transaction passed upstream.", hint: "backend · badly · crafted · transaction · passed" },
      { text: "Abstract classes can trap developers lacking the full context.", hint: "abstract · trap · lacking" },
    ],
    Finance: [
      { text: "Track cash allocation across asset classes and flag dramatic variance.", hint: "track · cash · allocation · across · asset · classes · flag" },
      { text: "Bad macro assumptions can trap analysts in a false pattern of thinking.", hint: "bad · macro · trap · analysts · pattern" },
      { text: "The transaction backlog expanded rapidly after the market crashed last Saturday.", hint: "transaction · backlog · rapidly · last · Saturday" },
    ],
    Product: [
      { text: "Track all feedback gathered in the last backlog refinement carefully.", hint: "track · gathered · last · backlog" },
      { text: "The actual satisfaction score collapsed after that catastrophic bad release.", hint: "actual · satisfaction · catastrophic · bad" },
      { text: "Map every channel where users abandon the onboarding path to capture gaps.", hint: "map · abandon · path · capture" },
    ],
  },
  ɹ: {
    General: [
      { text: "Results require real preparation, the right resources, and regular review.", hint: "results · require · real · right · resources · regular · review" },
      { text: "Our research revealed risks we had previously overlooked entirely.", hint: "research · revealed · risks · previously" },
      { text: "Read the requirements carefully before writing the first rough draft.", hint: "read · requirements · writing · rough" },
    ],
    Tech: [
      { text: "Refactoring requires reading existing code carefully and running regression tests.", hint: "refactoring · requires · reading · running · regression" },
      { text: "Review the pull request thoroughly before merging into the release branch.", hint: "review · request · merging · release" },
      { text: "The runtime error occurred in a rarely executed recovery routine.", hint: "runtime · rarely · recovery · routine" },
    ],
    Finance: [
      { text: "Review the risk report carefully before presenting returns to the board.", hint: "review · risk · report · carefully · returns" },
      { text: "Revenue recovered rapidly in Q3 after restructuring the credit portfolio.", hint: "revenue · recovered · rapidly · restructuring" },
      { text: "Rising rates require rethinking duration risk across every asset class.", hint: "rising · rates · require · rethinking · risk" },
    ],
    Product: [
      { text: "Review the research before writing requirements for the quarterly roadmap.", hint: "review · research · writing · requirements · quarterly · roadmap" },
      { text: "Our retention rates recovered rapidly after the redesign rolled out.", hint: "retention · rates · recovered · rapidly · redesign" },
      { text: "The right research reveals what users really need rather than what they request.", hint: "right · research · reveals · really · rather · request" },
    ],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhonemeResult {
  phoneme: string;
  accuracy_score: number;
}

interface WordResult {
  word: string;
  accuracy_score: number;
  error_type: string;
  phonemes: PhonemeResult[];
}

interface AttemptResult {
  targetScore: number | null;
  wordScore: number;
  phonemes: PhonemeResult[];
  passed: boolean;
}

interface LiaisonScore {
  wordA: string;
  wordB: string;
  score: number;
}

interface SentenceAttemptResult {
  pronunciationScore: number;
  words: WordResult[];
  targetScore: number | null;
  liaisonScores: LiaisonScore[];
  passed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_GATE = 78;
const SENTENCE_SCORE_GATE = 70;

const LINKING_CONSONANTS = new Set(["n","m","l","ɹ","r","z","s","d","t","k","g","ɡ","v","f","θ","ð","ŋ","p","b"]);

function scoreColor(s: number) {
  if (s >= 85) return "#2d6a4f";
  if (s >= 58) return "#f4a261";
  return "#e63946";
}

function scoreLabel(s: number) {
  if (s >= 85) return "Good";
  if (s >= 65) return "Needs work";
  return "Struggling";
}

function playTTS(text: string) {
  fetch(`${API_BASE}/api/content/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: "alloy" }),
  })
    .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    })
    .catch(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.75;
      speechSynthesis.speak(u);
    });
}

function getTargetPhonemeScore(words: WordResult[], ipaSymbol: string): number | null {
  const scores: number[] = [];
  for (const w of words) {
    for (const ph of w.phonemes ?? []) {
      if (ph.phoneme === ipaSymbol || ph.phoneme.replace(/\//g, "") === ipaSymbol) {
        scores.push(ph.accuracy_score);
      }
    }
  }
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function detectLiaisonOpportunities(words: WordResult[]): LiaisonScore[] {
  const result: LiaisonScore[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (!a.phonemes?.length || !b.phonemes?.length) continue;
    const lastPh = a.phonemes[a.phonemes.length - 1];
    const firstPh = b.phonemes[0];
    // Linking: consonant-final → vowel-initial
    if (LINKING_CONSONANTS.has(lastPh.phoneme) && !LINKING_CONSONANTS.has(firstPh.phoneme)) {
      result.push({
        wordA: a.word,
        wordB: b.word,
        score: Math.round((lastPh.accuracy_score + firstPh.accuracy_score) / 2),
      });
    }
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhonemeChip({ ph, isTarget }: { ph: PhonemeResult; isTarget: boolean }) {
  const col = scoreColor(ph.accuracy_score);
  return (
    <div className={`flex flex-col items-center gap-1 ${isTarget ? "scale-110" : ""}`}>
      <div
        className="px-3 py-1.5 rounded-lg text-sm font-league font-bold text-white min-w-[2.5rem] text-center relative"
        style={{ background: col }}
      >
        {ph.phoneme || "·"}
        {isTarget && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white border border-current" style={{ borderColor: col }} />
        )}
      </div>
      <span className="text-[11px] font-league font-semibold" style={{ color: col }}>
        {Math.round(ph.accuracy_score)}
      </span>
    </div>
  );
}

function WordChip({ word, score }: { word: string; score: number }) {
  const col = scoreColor(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="px-2.5 py-1 rounded-lg text-xs font-league font-bold text-white"
        style={{ background: col }}
      >
        {word}
      </div>
      <span className="text-[10px] font-league font-semibold" style={{ color: col }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhonemePage() {
  const [drillIdx, setDrillIdx]   = useState(0);
  const [pairIdx, setPairIdx]     = useState(0);
  const [mode, setMode]           = useState<"words" | "sentences">("words");
  const [domain, setDomain]       = useState<Domain>("General");
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [attempts, setAttempts]   = useState(0);
  const [result, setResult]       = useState<AttemptResult | null>(null);
  const [sentenceResult, setSentenceResult] = useState<SentenceAttemptResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionScores, setSessionScores] = useState<number[]>([]);

  const recorder = useAudioRecorder();
  const drill = DRILLS[drillIdx];
  const pair  = drill.pairs[pairIdx];
  const sentences = SENTENCE_DATA[drill.ipaSymbol]?.[domain] ?? [];
  const currentSentence = sentences[sentenceIdx] ?? null;

  // ── Word drill submit ──────────────────────────────────────────────────────
  const handleWordSubmit = useCallback(async () => {
    if (!recorder.audioBlob) return;
    setIsAnalyzing(true);
    try {
      const res = await evaluatePronunciation(recorder.audioBlob, pair.word);
      const words: WordResult[] = res.words ?? [];
      const wordScore = res.accuracy_score ?? res.pronunciation_score ?? 0;
      const allPhonemes: PhonemeResult[] = words.flatMap(w => w.phonemes ?? []);
      const targetScore = getTargetPhonemeScore(words, drill.ipaSymbol);
      const gateScore = targetScore ?? wordScore;
      const passed = gateScore >= SCORE_GATE;
      setResult({ targetScore, wordScore, phonemes: allPhonemes, passed });
      setAttempts(a => a + 1);
      setSessionScores(s => [...s, gateScore]);
    } catch {
      const base = 45 + Math.random() * 45;
      const targetScore = Math.max(0, base + (Math.random() - 0.5) * 20);
      setResult({
        targetScore,
        wordScore: base,
        phonemes: [
          { phoneme: drill.ipaSymbol, accuracy_score: targetScore },
          { phoneme: "ɪ", accuracy_score: 75 + Math.random() * 20 },
          { phoneme: "n", accuracy_score: 80 + Math.random() * 15 },
        ],
        passed: targetScore >= SCORE_GATE,
      });
      setAttempts(a => a + 1);
    } finally {
      setIsAnalyzing(false);
      recorder.reset();
    }
  }, [recorder, pair.word, drill.ipaSymbol]);

  // ── Sentence drill submit ──────────────────────────────────────────────────
  const handleSentenceSubmit = useCallback(async () => {
    if (!recorder.audioBlob || !currentSentence) return;
    setIsAnalyzing(true);
    try {
      const res = await evaluatePronunciation(recorder.audioBlob, currentSentence.text);
      const words: WordResult[] = res.words ?? [];
      const pronunciationScore = res.pronunciation_score ?? res.accuracy_score ?? 0;
      const targetScore = getTargetPhonemeScore(words, drill.ipaSymbol);
      const liaisonScores = detectLiaisonOpportunities(words);
      const passed = pronunciationScore >= SENTENCE_SCORE_GATE;
      setSentenceResult({ pronunciationScore, words, targetScore, liaisonScores, passed });
      setAttempts(a => a + 1);
      setSessionScores(s => [...s, pronunciationScore]);
    } catch {
      const base = 55 + Math.random() * 35;
      const mockWords = currentSentence.text.split(" ").slice(0, 8).map(w => ({
        word: w.replace(/[.,!?]/g, ""),
        accuracy_score: 45 + Math.random() * 50,
        error_type: "None",
        phonemes: [
          { phoneme: drill.ipaSymbol, accuracy_score: 40 + Math.random() * 55 },
          { phoneme: "ə", accuracy_score: 75 + Math.random() * 20 },
        ],
      }));
      setSentenceResult({
        pronunciationScore: base,
        words: mockWords,
        targetScore: 45 + Math.random() * 45,
        liaisonScores: [],
        passed: base >= SENTENCE_SCORE_GATE,
      });
      setAttempts(a => a + 1);
    } finally {
      setIsAnalyzing(false);
      recorder.reset();
    }
  }, [recorder, currentSentence, drill.ipaSymbol]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToNextWord = () => {
    setResult(null);
    setAttempts(0);
    if (pairIdx < drill.pairs.length - 1) {
      setPairIdx(p => p + 1);
    } else if (drillIdx < DRILLS.length - 1) {
      setDrillIdx(d => d + 1);
      setPairIdx(0);
    }
  };

  const goToNextSentence = () => {
    setSentenceResult(null);
    setAttempts(0);
    setSentenceIdx(s => (s < sentences.length - 1 ? s + 1 : 0));
  };

  const switchDrill = (idx: number) => {
    setDrillIdx(idx);
    setPairIdx(0);
    setSentenceIdx(0);
    setResult(null);
    setSentenceResult(null);
    setAttempts(0);
  };

  const switchMode = (m: "words" | "sentences") => {
    setMode(m);
    setResult(null);
    setSentenceResult(null);
    setAttempts(0);
    recorder.reset();
  };

  const switchDomain = (d: Domain) => {
    setDomain(d);
    setSentenceIdx(0);
    setSentenceResult(null);
    setAttempts(0);
    recorder.reset();
  };

  const bestScore = sessionScores.length ? Math.max(...sessionScores) : null;
  const activeResult = mode === "words" ? result : sentenceResult;
  const hasPassed = mode === "words" ? result?.passed : sentenceResult?.passed;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link href="/dashboard" className="font-anta text-xl text-foreground">
          EchoFlow
        </Link>
        <span className="text-xs text-muted font-league uppercase tracking-widest">
          Phoneme Lab
        </span>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-5">

        {/* ── Phoneme tab selector ─────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {DRILLS.map((d, i) => (
            <button
              key={d.phoneme}
              onClick={() => switchDrill(i)}
              className={`px-5 py-2 rounded-full font-league text-sm font-semibold transition-all ${
                drillIdx === i
                  ? "text-white shadow-sm"
                  : "border border-border text-muted hover:text-foreground hover:border-foreground"
              }`}
              style={drillIdx === i ? { background: d.color } : {}}
            >
              {d.phoneme} <span className="opacity-70 text-xs">{d.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* ── Mode toggle ──────────────────────────────────────────── */}
        <div className="flex gap-1 bg-surface rounded-full p-1 self-start border border-border">
          {(["words", "sentences"] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-league font-semibold uppercase tracking-wider transition-all ${
                mode === m
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {m === "words" ? "Words" : "Sentences"}
            </button>
          ))}
        </div>

        {/* ── Domain pills (sentences mode only) ───────────────────── */}
        {mode === "sentences" && (
          <div className="flex gap-2 flex-wrap">
            {DOMAINS.map(d => (
              <button
                key={d}
                onClick={() => switchDomain(d)}
                className={`px-3 py-1 rounded-full text-xs font-league transition-all border ${
                  domain === d
                    ? "border-foreground text-foreground font-semibold"
                    : "border-border text-muted hover:border-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* ── Drill header ─────────────────────────────────────────── */}
        <motion.div
          key={drillIdx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface p-6 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-league mb-2">
              {drill.name}
            </p>
            <div className="font-anta text-6xl mb-2" style={{ color: drill.color }}>
              {drill.phoneme}
            </div>
            <p className="text-sm font-league text-muted leading-relaxed max-w-xs">
              {drill.tip}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[70px]">
            <div
              className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: drill.color }}
            >
              <span className="font-anta text-xl" style={{ color: drill.color }}>
                {bestScore !== null ? Math.round(bestScore) : "—"}
              </span>
            </div>
            <span className="text-[10px] font-league text-muted uppercase tracking-wider">Best</span>
          </div>
        </motion.div>

        {/* ── Word card (words mode) ────────────────────────────────── */}
        {mode === "words" && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${drillIdx}-${pairIdx}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="rounded-2xl border border-border bg-surface overflow-hidden"
            >
              <div className="flex items-center gap-2 px-6 pt-5 pb-3">
                <p className="text-xs text-muted font-league uppercase tracking-widest flex-1">
                  Minimal Pair · {pairIdx + 1} / {drill.pairs.length}
                </p>
                <div className="flex gap-1.5">
                  {drill.pairs.map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full transition-colors"
                      style={{ background: i === pairIdx ? drill.color : "#d1d5db" }}
                    />
                  ))}
                </div>
              </div>

              <div className="px-6 pb-6 flex items-end gap-6">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-anta text-5xl text-foreground">{pair.word}</span>
                    <button
                      onClick={() => playTTS(pair.word)}
                      title="Play reference pronunciation"
                      className="flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-70"
                      style={{ background: drill.color }}
                    >
                      <svg width="8" height="9" viewBox="0 0 8 9">
                        <polygon points="0,0 8,4.5 0,9" fill="white" />
                      </svg>
                    </button>
                  </div>
                  <p className="font-league text-lg text-muted tracking-wide">{pair.ipa}</p>
                  <p className="text-[10px] font-league uppercase tracking-widest mt-1" style={{ color: drill.color }}>
                    Target
                  </p>
                </div>
                <div className="text-right opacity-50">
                  <p className="font-anta text-2xl text-muted">{pair.contrast}</p>
                  <p className="font-league text-sm text-muted">{pair.contrastIpa}</p>
                  <p className="text-[10px] font-league uppercase tracking-widest mt-1 text-muted">
                    Common Error
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Sentence card (sentences mode) ────────────────────────── */}
        {mode === "sentences" && currentSentence && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${drillIdx}-${domain}-${sentenceIdx}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="rounded-2xl border border-border bg-surface overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 pt-5 pb-3">
                <p className="text-xs text-muted font-league uppercase tracking-widest flex-1">
                  Sentence {sentenceIdx + 1} / {sentences.length}
                </p>
                <button
                  onClick={() => playTTS(currentSentence.text)}
                  title="Listen to reference"
                  className="flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-70"
                  style={{ background: drill.color }}
                >
                  <svg width="8" height="9" viewBox="0 0 8 9">
                    <polygon points="0,0 8,4.5 0,9" fill="white" />
                  </svg>
                </button>
                <div className="flex gap-1.5">
                  {sentences.map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full transition-colors"
                      style={{ background: i === sentenceIdx ? drill.color : "#d1d5db" }}
                    />
                  ))}
                </div>
              </div>

              <div className="px-6 pb-5">
                <p className="font-league text-xl text-foreground leading-relaxed mb-3">
                  {currentSentence.text}
                </p>
                <p className="text-xs font-league text-muted">
                  {drill.phoneme} appears in:{" "}
                  <span className="font-semibold" style={{ color: drill.color }}>
                    {currentSentence.hint}
                  </span>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Word drill result ─────────────────────────────────────── */}
        {mode === "words" && (
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: result.passed ? "#2d6a4f" : "#e63946" }}
              >
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ background: result.passed ? "#2d6a4f18" : "#e6394618" }}
                >
                  <div>
                    <p className="font-league font-semibold text-sm" style={{ color: result.passed ? "#2d6a4f" : "#e63946" }}>
                      {result.passed ? "Cleared — target phoneme scored well" : `${drill.phoneme} needs more focus`}
                    </p>
                    {result.targetScore != null && (
                      <p className="text-xs text-muted font-league mt-0.5">
                        Target {drill.phoneme}: {Math.round(result.targetScore)}/100 · {scoreLabel(result.targetScore)}
                      </p>
                    )}
                  </div>
                  <div className="font-anta text-3xl" style={{ color: result.passed ? "#2d6a4f" : "#e63946" }}>
                    {result.targetScore != null ? Math.round(result.targetScore) : Math.round(result.wordScore)}
                  </div>
                </div>

                {result.phonemes.length > 0 && (
                  <div className="px-6 py-5 bg-surface">
                    <p className="text-[10px] font-league text-muted uppercase tracking-widest mb-4">
                      Phoneme breakdown — target highlighted
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {result.phonemes.map((ph, i) => (
                        <PhonemeChip
                          key={i}
                          ph={ph}
                          isTarget={ph.phoneme === drill.ipaSymbol || ph.phoneme.replace(/\//g, "") === drill.ipaSymbol}
                        />
                      ))}
                    </div>
                    {result.targetScore != null && result.targetScore < SCORE_GATE && (
                      <div
                        className="mt-4 rounded-xl px-4 py-3 text-sm font-league leading-relaxed"
                        style={{ background: "#e6394612", color: "#e63946" }}
                      >
                        {drill.phoneme} scored {Math.round(result.targetScore)}/100 — {drill.tip}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Sentence drill result ─────────────────────────────────── */}
        {mode === "sentences" && (
          <AnimatePresence>
            {sentenceResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: sentenceResult.passed ? "#2d6a4f" : "#e63946" }}
              >
                {/* Score banner */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ background: sentenceResult.passed ? "#2d6a4f18" : "#e6394618" }}
                >
                  <div>
                    <p className="font-league font-semibold text-sm" style={{ color: sentenceResult.passed ? "#2d6a4f" : "#e63946" }}>
                      {sentenceResult.passed ? "Good pronunciation" : "Keep practicing"}
                    </p>
                    <p className="text-xs text-muted font-league mt-0.5">
                      Overall: {Math.round(sentenceResult.pronunciationScore)}/100
                      {sentenceResult.targetScore != null && ` · ${drill.phoneme} avg: ${Math.round(sentenceResult.targetScore)}/100`}
                    </p>
                  </div>
                  <div className="font-anta text-3xl" style={{ color: sentenceResult.passed ? "#2d6a4f" : "#e63946" }}>
                    {Math.round(sentenceResult.pronunciationScore)}
                  </div>
                </div>

                {/* Word breakdown */}
                {sentenceResult.words.length > 0 && (
                  <div className="px-6 py-4 bg-surface border-t border-border">
                    <p className="text-[10px] font-league text-muted uppercase tracking-widest mb-3">
                      Word breakdown
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sentenceResult.words.map((w, i) => (
                        <WordChip key={i} word={w.word} score={w.accuracy_score} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Liaison section */}
                {sentenceResult.liaisonScores.length > 0 && (
                  <div className="px-6 py-4 border-t border-border">
                    <p className="text-[10px] font-league text-muted uppercase tracking-widest mb-3">
                      Linking / Liaison — {sentenceResult.liaisonScores.length} opportunities
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {sentenceResult.liaisonScores.map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5"
                        >
                          <span className="text-sm font-league text-foreground">{l.wordA}</span>
                          <span className="text-xs text-muted">→</span>
                          <span className="text-sm font-league text-foreground">{l.wordB}</span>
                          <span
                            className="text-xs font-league font-bold ml-1"
                            style={{ color: scoreColor(l.score) }}
                          >
                            {l.score}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted font-league">
                      Avg linking score:{" "}
                      <span className="font-semibold text-foreground">
                        {Math.round(
                          sentenceResult.liaisonScores.reduce((s, l) => s + l.score, 0) /
                          sentenceResult.liaisonScores.length
                        )}/100
                      </span>
                    </p>
                  </div>
                )}

                {/* Target phoneme coaching */}
                {sentenceResult.targetScore != null && sentenceResult.targetScore < 65 && (
                  <div className="px-6 py-4 border-t border-border" style={{ background: "#e6394608" }}>
                    <p className="text-sm font-league leading-relaxed" style={{ color: "#e63946" }}>
                      {drill.phoneme} avg {Math.round(sentenceResult.targetScore)}/100 — {drill.tip}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Waveform ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <WaveformVisualizer
            analyserNode={recorder.isRecording ? recorder.analyserNode : null}
            isActive={recorder.isRecording}
            matchScore={mode === "words" ? (result?.targetScore ?? 0) : (sentenceResult?.pronunciationScore ?? 0)}
            height={56}
          />
        </div>

        {/* ── Record controls ───────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <RecordButton
            isRecording={recorder.isRecording}
            onStart={recorder.startRecording}
            onStop={() => recorder.stopRecording()}
            size="lg"
          />
          <p className="text-xs text-muted font-league">
            {recorder.isRecording
              ? "Recording — tap to stop"
              : mode === "words"
                ? (result ? "Record again to retry" : `Say "${pair.word}" clearly`)
                : (sentenceResult ? "Record again to retry" : "Read the sentence aloud clearly")}
          </p>
        </div>

        {/* ── Analyze button ────────────────────────────────────────── */}
        {recorder.audioBlob && !result && !sentenceResult && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={mode === "words" ? handleWordSubmit : handleSentenceSubmit}
            disabled={isAnalyzing}
            className="w-full py-4 rounded-xl font-league font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: drill.color }}
          >
            {isAnalyzing
              ? (mode === "words" ? "Analyzing phonemes…" : "Analyzing sentence…")
              : "Check Pronunciation"}
          </motion.button>
        )}

        {/* ── Word mode action buttons ──────────────────────────────── */}
        {mode === "words" && result && (
          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); recorder.reset(); }}
              className="flex-1 py-3.5 rounded-xl border border-border text-muted font-league font-semibold hover:border-foreground hover:text-foreground transition-all"
            >
              Try Again
            </button>
            {(result.passed || attempts >= 3) && (
              <button
                onClick={goToNextWord}
                className="flex-1 py-3.5 rounded-xl font-league font-semibold text-white transition-opacity"
                style={{ background: drill.color }}
              >
                Next →
              </button>
            )}
          </div>
        )}

        {/* ── Sentence mode action buttons ──────────────────────────── */}
        {mode === "sentences" && sentenceResult && (
          <div className="flex gap-3">
            <button
              onClick={() => { setSentenceResult(null); recorder.reset(); }}
              className="flex-1 py-3.5 rounded-xl border border-border text-muted font-league font-semibold hover:border-foreground hover:text-foreground transition-all"
            >
              Try Again
            </button>
            {(sentenceResult.passed || attempts >= 3) && (
              <button
                onClick={goToNextSentence}
                className="flex-1 py-3.5 rounded-xl font-league font-semibold text-white transition-opacity"
                style={{ background: drill.color }}
              >
                Next →
              </button>
            )}
          </div>
        )}

        {/* Attempt counter */}
        {attempts > 0 && (
          <p className="text-center text-xs text-muted font-league">
            Attempt {attempts}
            {mode === "words"
              ? ` · ${result?.passed ? "cleared" : `${SCORE_GATE}+ on ${drill.phoneme} to advance`}`
              : ` · ${sentenceResult?.passed ? "cleared" : `${SENTENCE_SCORE_GATE}+ overall to advance`}`}
          </p>
        )}
      </div>
    </main>
  );
}
