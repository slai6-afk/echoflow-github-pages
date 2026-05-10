"use client";

import { motion } from "framer-motion";
import { RedCircle, YellowTriangle, BlueRect } from "./BauhausShapes";

export interface AssessedPhoneme {
  phoneme: string;       // IPA symbol from Azure
  accuracy_score: number; // 0–100 raw (pre-calibration)
}

export interface PhoneticWordProps {
  word: string;
  phonemes: AssessedPhoneme[];
  /** Called when user clicks the red circle on a bad phoneme */
  onPlayReference?: (phoneme: string, word: string) => void;
  /** If true, show shape indicators; if false, just show annotations */
  showFeedback?: boolean;
  size?: "sm" | "md" | "lg";
}

const FONT_SIZES = { sm: "text-base", md: "text-2xl", lg: "text-4xl" };
const PHONEME_SIZES = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };

function scoreToLevel(score: number): "good" | "caution" | "error" {
  if (score >= 75) return "good";
  if (score >= 55) return "caution";
  return "error";
}

const SPRING = { type: "spring" as const, stiffness: 500, damping: 30 };

export default function PhoneticWord({
  word,
  phonemes,
  onPlayReference,
  showFeedback = true,
  size = "md",
}: PhoneticWordProps) {
  // Group phonemes evenly across the word's character width for alignment
  const colCount = Math.max(phonemes.length, 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING}
      className="inline-flex flex-col items-center gap-1"
    >
      {/* ── The word ── */}
      <span
        className={`font-anta font-bold text-foreground tracking-tight leading-none ${FONT_SIZES[size]}`}
      >
        {word}
      </span>

      {/* ── Phoneme annotation row ── */}
      {phonemes.length > 0 && (
        <div
          className="flex items-end w-full"
          style={{ display: "grid", gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: "2px" }}
        >
          {phonemes.map((p, i) => {
            const level = scoreToLevel(p.accuracy_score);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.04 }}
                className="flex flex-col items-center gap-0.5"
              >
                {/* IPA symbol */}
                <span
                  className={`font-mono leading-none ${PHONEME_SIZES[size]} ${
                    level === "error"
                      ? "text-bauhaus-red font-bold"
                      : level === "caution"
                        ? "text-bauhaus-yellow"
                        : "text-muted"
                  }`}
                >
                  {p.phoneme}
                </span>

                {/* Bauhaus feedback shape */}
                {showFeedback && (
                  <>
                    {level === "error" && (
                      <RedCircle
                        size={9}
                        onClick={() => onPlayReference?.(p.phoneme, word)}
                      />
                    )}
                    {level === "caution" && <YellowTriangle size={9} />}
                    {level === "good" && <BlueRect width={8} height={3} />}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Word-level score bar ── */}
      {showFeedback && phonemes.length > 0 && (
        <div className="w-full h-0.5 bg-surface-2 rounded-full overflow-hidden mt-0.5">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor:
                phonemes.every((p) => p.accuracy_score >= 75)
                  ? "#1D3557"
                  : phonemes.some((p) => p.accuracy_score < 55)
                    ? "#E63946"
                    : "#F4A261",
            }}
            initial={{ width: "0%" }}
            animate={{
              width: `${
                phonemes.reduce((s, p) => s + p.accuracy_score, 0) /
                phonemes.length
              }%`,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}
