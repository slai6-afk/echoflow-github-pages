"use client";

import { motion } from "framer-motion";

interface FocusRingProps {
  score: number; // 0–100
  size?: number;
  label?: string;
  sublabel?: string;
}

export default function FocusRing({
  score,
  size = 200,
  label,
  sublabel,
}: FocusRingProps) {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= 90
      ? "#2d6a4f"
      : score >= 70
        ? "#1d3557"
        : score >= 50
          ? "#f4a261"
          : "#e63946";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="rotate-[-90deg]"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#d4d4d4"
          strokeWidth="8"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${strokeColor}66)` }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-anta text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Math.round(score)}
        </motion.span>
        {label && (
          <span className="text-xs text-muted font-league uppercase tracking-widest mt-1">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-xs text-muted font-league mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
