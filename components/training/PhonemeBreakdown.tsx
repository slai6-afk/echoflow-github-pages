"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";

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

const BAUHAUS_GREEN = "#3C6255";
const BAUHAUS_ORANGE = "#FF8E60";
const MUTED = "#4b4b51";
const PASS_SCORE = 85;

function playWord(word: string) {
  fetch(`${API_BASE}/api/content/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: word, voice: "alloy" }),
  })
    .then((r) => {
      if (!r.ok) throw new Error("TTS unavailable");
      return r.blob();
    })
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

function classifyWordError(errorType: string): "clean" | "substitution" | "incorrect" {
  const normalized = errorType.toLowerCase();
  if (normalized === "none") return "clean";
  if (normalized.includes("substitution")) return "substitution";
  return "incorrect";
}

function PlayReferenceIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Play reference word audio"
      className="inline-flex items-center gap-1 text-[10px] text-[#111111] hover:opacity-70 transition-opacity"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M2 2v10" />
        <path d="M5 2v10" />
        <path d="M8 2 12 7 8 12V2Z" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

function SubstitutionMarker({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Substitution details"
      className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-[#FF8E60] hover:opacity-70 transition-opacity"
    />
  );
}

function PhonemeWord({
  result,
  idx,
  onOpenSubstitution,
}: {
  result: WordResult;
  idx: number;
  onOpenSubstitution: (word: WordResult) => void;
}) {
  const wordState = classifyWordError(result.error_type);
  const wordIsCorrect = result.accuracy_score >= PASS_SCORE;
  const phonemeList = result.phonemes ?? [];

  const wordColor = wordIsCorrect ? BAUHAUS_GREEN : BAUHAUS_ORANGE;

  const marker = wordState === "substitution"
    ? (
      <SubstitutionMarker onClick={() => onOpenSubstitution(result)} />
    )
    : !wordIsCorrect
      ? <span className="w-2 h-2 rounded-full bg-[#FF8E60]" />
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, type: "spring", stiffness: 420, damping: 32 }}
      className="flex flex-col gap-1 min-w-[6.5rem]"
    >
      <div className="flex items-center gap-2">
        <ruby className="flex flex-col leading-none not-italic">
          <span
            className="font-league text-lg font-semibold tracking-tight"
            style={{ color: wordColor }}
          >
            {result.word}
          </span>
          <rt className="mt-1">
            <span className="flex items-center gap-1 text-[10px] font-mono tracking-tight text-[#4b4b51] not-italic">
              {phonemeList.length > 0
                ? phonemeList.map((ph, i) => (
                    <span
                      key={`${result.word}-${i}`}
                      style={{
                        color:
                          ph.accuracy_score >= PASS_SCORE
                            ? BAUHAUS_GREEN
                            : BAUHAUS_ORANGE,
                      }}
                    >
                      {ph.phoneme}
                    </span>
                  ))
                : "·"}
            </span>
          </rt>
        </ruby>
        <div className="pt-1">
          <PlayReferenceIcon onClick={() => playWord(result.word)} />
        </div>
      </div>

      <div className="h-3 flex items-center">{marker}</div>
    </motion.div>
  );
}

export default function PhonemeBreakdown({ words }: PhonemeBreakdownProps) {
  const [substitutionWord, setSubstitutionWord] = useState<WordResult | null>(null);

  const summary = useMemo(() => {
    const mastery = words.filter((w) => w.accuracy_score >= PASS_SCORE).length;
    const weak = words.filter((w) => w.accuracy_score < PASS_SCORE).length;
    return { mastery, weak };
  }, [words]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-league uppercase tracking-[0.14em]">
          <span className="text-[#111111]">Phoneme Depth View</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#111111]">
              <span className="w-2 h-2 bg-[#3C6255]" />
              {summary.mastery} mastery
            </span>
            <span className="flex items-center gap-1.5 text-[#111111]">
              <span className="w-2 h-2 bg-[#FF8E60]" />
              {summary.weak} below 85
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {words.map((w, i) => (
            <PhonemeWord
              key={`${w.word}-${i}`}
              result={w}
              idx={i}
              onOpenSubstitution={setSubstitutionWord}
            />
          ))}
        </div>

        <p className="text-[10px] text-[#4b4b51] tracking-wide">
          Line play icon = OpenAI TTS reference. Orange circle = inaccurate word.
          Orange triangle = substitution alert.
        </p>
      </div>

      <AnimatePresence>
        {substitutionWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/88 backdrop-blur-[1px] flex items-center justify-center p-6"
            onClick={() => setSubstitutionWord(null)}
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="max-w-xl w-full bg-white p-6 section-rule"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#111111]">
                  Substitution Report
                </p>
                <button
                  onClick={() => setSubstitutionWord(null)}
                  className="text-sm text-[#111111] hover:opacity-60"
                >
                  Close
                </button>
              </div>
              <p className="text-[#111111] text-lg font-semibold mb-1">
                Word: {substitutionWord.word}
              </p>
              <p className="text-sm text-[#4b4b51] mb-3">
                Error type: {substitutionWord.error_type || "substitution"}
              </p>
              <div className="flex flex-wrap gap-2">
                {substitutionWord.phonemes
                  .filter((p) => p.accuracy_score < PASS_SCORE)
                  .slice(0, 6)
                  .map((p, i) => (
                    <span
                      key={`${p.phoneme}-${i}`}
                      className="text-sm"
                      style={{ color: BAUHAUS_ORANGE }}
                    >
                      {p.phoneme} ({Math.round(p.accuracy_score)})
                    </span>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
