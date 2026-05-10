"use client";

import { motion, AnimatePresence } from "framer-motion";

interface RecordButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { outer: 64, inner: 28, icon: 10 },
  md: { outer: 88, inner: 40, icon: 14 },
  lg: { outer: 120, inner: 52, icon: 18 },
};

export default function RecordButton({
  isRecording,
  onStart,
  onStop,
  disabled,
  size = "md",
}: RecordButtonProps) {
  const { outer, inner } = sizes[size];

  return (
    <button
      className="relative flex items-center justify-center rounded-full focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ width: outer, height: outer }}
      onClick={isRecording ? onStop : onStart}
      disabled={disabled}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-foreground opacity-20"
        style={{ width: outer, height: outer }}
      />

      {/* Pulse rings when recording */}
      <AnimatePresence>
        {isRecording && (
          <>
            <motion.div
              className="absolute rounded-full border border-danger"
              style={{ width: outer, height: outer }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute rounded-full border border-danger"
              style={{ width: outer, height: outer }}
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Inner button */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: inner,
          height: inner,
          backgroundColor: isRecording ? "#ef4444" : "#1b3a8c",
        }}
        animate={{
          scale: isRecording ? [1, 1.05, 1] : 1,
          backgroundColor: isRecording ? "#ef4444" : "#1b3a8c",
        }}
        transition={{
          scale: {
            duration: 1,
            repeat: isRecording ? Infinity : 0,
            ease: "easeInOut",
          },
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="stop"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="bg-white rounded-sm"
              style={{ width: sizes[size].icon, height: sizes[size].icon }}
            />
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center gap-0.5"
            >
              <div
                className="bg-white rounded-full"
                style={{
                  width: sizes[size].icon * 0.55,
                  height: sizes[size].icon * 0.8,
                }}
              />
              <div
                className="bg-white opacity-60"
                style={{ width: sizes[size].icon * 0.7, height: 1 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
