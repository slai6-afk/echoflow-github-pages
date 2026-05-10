"use client";

import { motion } from "framer-motion";
import { fetchTtsAudio } from "@/lib/api";

export interface AssessedPhoneme {
  phoneme: string;
  accuracy_score: number;
}

export interface WordResult {
  word: string;
  accuracy_score: number;
  error_type: string; // "None" | "Omission" | "Insertion" | "Mispronunciation"
  phonemes: AssessedPhoneme[];
}

interface PhonemeBreakdownProps {
  words: WordResult[];
  videoId?: string;
}

const GOOD = "#2d6a4f";
const BAD  = "#e63946";
const WARN = "#f4a261";
const MUTED = "#666666";

function playWord(word: string) {
  fetchTtsAudio(word, "alloy")
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    })
    .catch(() => {
      const u = new SpeechSynthesisUtterance(word);
      u.rate = 0.7;
      speechSynthesis.speak(u);
    });
}

function PhonemeChip({ ph }: { ph: AssessedPhoneme }) {
  const score = ph.accuracy_score;
  const color = score >= 85 ? GOOD : score >= 55 ? WARN : BAD;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="px-2 py-1 text-xs font-league font-bold min-w-[2rem] text-center border"
        style={{ color, borderColor: `${color}66` }}
      >
        {ph.phoneme || "·"}
      </div>
      <span className="text-[10px] font-league" style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function WordCard({ w, idx }: { w: WordResult; idx: number }) {
  const isMispronounced = w.error_type === "Mispronunciation";
  const isOmission     = w.error_type === "Omission";
  const isInsertion    = w.error_type === "Insertion";

  const wordColor =
    w.accuracy_score >= 85 ? GOOD
    : w.accuracy_score >= 55 ? WARN
    : BAD;

  const hasPhonemesData = w.phonemes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 30 }}
      className="flex flex-col gap-2 p-3 min-w-[6rem] border-b border-border/60"
    >
      {/* Word + score header */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-league font-bold text-sm"
          style={{ color: wordColor }}
        >
          {w.word}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Play reference audio */}
          <button
            onClick={() => playWord(w.word)}
            title="Play reference pronunciation"
            className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity rounded-full border border-foreground/40"
          >
            <svg width="7" height="8" viewBox="0 0 7 8">
              <polygon points="0,0 7,4 0,8" fill="#193d7a" />
            </svg>
          </button>
          <span
            className="text-[10px] font-league font-bold"
            style={{ color: wordColor }}
          >
            {Math.round(w.accuracy_score)}
          </span>
        </div>
      </div>

      {/* Error type badge */}
      {(isMispronounced || isOmission || isInsertion) && (
        <div
          className="text-[10px] font-league px-1.5 py-0.5 w-fit border"
          style={{ color: isMispronounced ? BAD : isOmission ? MUTED : WARN, borderColor: "currentColor" }}
        >
          {isMispronounced ? "MISPRONOUNCED"
            : isOmission ? "OMITTED"
            : "INSERTED"}
        </div>
      )}

      {/* Phoneme chips */}
      {hasPhonemesData ? (
        <div className="flex flex-wrap gap-1">
          {w.phonemes.map((ph, i) => (
            <PhonemeChip key={i} ph={ph} />
          ))}
        </div>
      ) : (
        // No phoneme data — show word-level bar
        <div className="h-1 w-full bg-border overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: wordColor }}
            initial={{ width: "0%" }}
            animate={{ width: `${w.accuracy_score}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 + 0.2 }}
          />
        </div>
      )}

      {/* Substitution note — if mispronounced and we have phoneme data */}
      {isMispronounced && hasPhonemesData && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-2 mt-0.5">
          {w.phonemes
            .filter((ph) => ph.accuracy_score < 85)
            .map((ph, i) => (
              <p key={i} className="text-[10px] font-league text-muted leading-tight">
                Expected{" "}
                <span className="font-bold" style={{ color: GOOD }}>
                  [{ph.phoneme}]
                </span>{" "}
                — try saying it slower
              </p>
            ))}
        </div>
      )}
    </motion.div>
  );
}

export default function PhonemeBreakdown({ words }: PhonemeBreakdownProps) {
  const goodCount = words.filter((w) => w.accuracy_score >= 85).length;
  const badCount  = words.filter((w) => w.accuracy_score < 55).length;

  return (
    <div className="flex flex-col gap-3 py-4 section-cut">
      {/* Legend */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-league text-muted uppercase tracking-widest">
          Phoneme Breakdown
        </p>
        <div className="flex items-center gap-3 text-[10px] font-league">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 inline-block" style={{ background: GOOD }} />
            {goodCount} correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 inline-block" style={{ background: BAD }} />
            {badCount} error{badCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Word cards */}
      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <WordCard key={i} w={w} idx={i} />
        ))}
      </div>

      <p className="text-[10px] font-league text-muted">
        ▶ plays reference · colors: green ≥ 85 · orange ≥ 55 · red &lt; 55
      </p>
    </div>
  );
}
