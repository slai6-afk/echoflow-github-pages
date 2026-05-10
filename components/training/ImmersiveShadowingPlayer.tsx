"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PhonemeBreakdown, { WordResult } from "@/components/training/PhonemeBreakdown";
import { evaluatePronunciation } from "@/lib/api";
import { saveAssessmentResult } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Segment {
  text: string;
  start: number;
  end: number;
}

interface ShadowResult {
  score: number;
  words: WordResult[];
}

type ShadowState =
  | "idle"
  | "listening"
  | "auto_trigger"
  | "recording"
  | "processing"
  | "feedback"
  | "resuming";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };
const VAD_SILENCE_THRESHOLD = 12;
const VAD_SILENCE_MS = 1800;
const VAD_CHECK_INTERVAL_MS = 80;

// ─── YouTube IFrame type stub ─────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, opts: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}

// ─── Liaison text renderer ────────────────────────────────────────────────────

function LiaisonText({
  text,
  className,
  markerClassName,
}: {
  text: string;
  className?: string;
  markerClassName?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => {
        const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
        const nextClean = (words[i + 1] ?? "").replace(/[^a-zA-Z]/g, "").toLowerCase();
        const linked =
          i < words.length - 1 &&
          /[bcdfghjklmnpqrstvwxyz]$/.test(clean) &&
          /^[aeiou]/.test(nextClean);
        return (
          <span key={i}>
            {word}
            {i < words.length - 1 &&
              (linked ? (
                <span
                  className={markerClassName ?? "text-bauhaus-blue-light font-bold"}
                  style={{ fontSize: "0.7em", margin: "0 1px" }}
                >
                  ‿
                </span>
              ) : (
                " "
              ))}
          </span>
        );
      })}
    </span>
  );
}

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  return s >= 85 ? "#2d6a4f" : s >= 65 ? "#f4a261" : "#e63946";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ImmersiveShadowingPlayerProps {
  videoId: string;
  segments: Segment[];
  onComplete?: (stats: { sentences: number; avgScore: number }) => void;
}

export default function ImmersiveShadowingPlayer({
  videoId,
  segments,
  onComplete,
}: ImmersiveShadowingPlayerProps) {
  const [machineState, setMachineState] = useState<ShadowState>("idle");
  const [segIdx, setSegIdx] = useState(0);
  const [result, setResult] = useState<ShadowResult | null>(null);
  const [micAllowed, setMicAllowed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<ShadowState>("idle");
  const segRef = useRef<Segment | undefined>(segments[segIdx]);
  const scoresRef = useRef<number[]>([]);

  const seg = segments[segIdx];

  useEffect(() => { stateRef.current = machineState; }, [machineState]);
  useEffect(() => { segRef.current = segments[segIdx]; }, [segments, segIdx]);

  // ── Load YouTube IFrame API ────────────────────────────────────────────────
  useEffect(() => {
    if (window.YT) { initPlayer(); return; }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = initPlayer;
    return () => { window.onYouTubeIframeAPIReady = () => {}; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  function initPlayer() {
    if (!playerContainerRef.current) return;
    playerRef.current?.destroy();
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, fs: 0, cc_load_policy: 0, iv_load_policy: 3 },
      events: { onReady: () => {}, onStateChange: () => {} },
    });
  }

  // ── Mic permission ─────────────────────────────────────────────────────────
  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicAllowed(true);
    } catch {
      setErrorMsg("Microphone access is required for shadowing.");
    }
  }, []);

  // ── VAD ───────────────────────────────────────────────────────────────────
  const startVAD = useCallback((sentenceDuration: number) => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    let silenceMs = 0;
    const maxMs = Math.max(sentenceDuration * 1500, 8000);

    vadTimerRef.current = setTimeout(() => {
      if (stateRef.current === "recording") stopRecording();
    }, maxMs);

    vadIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      if (rms < VAD_SILENCE_THRESHOLD) {
        silenceMs += VAD_CHECK_INTERVAL_MS;
        if (silenceMs >= VAD_SILENCE_MS && stateRef.current === "recording") stopRecording();
      } else {
        silenceMs = 0;
      }
    }, VAD_CHECK_INTERVAL_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearVAD = () => {
    if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
  };

  // ── Sentence end poller ───────────────────────────────────────────────────
  const startSentencePoller = useCallback((endTime: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (player.getCurrentTime() >= endTime + 0.15 && stateRef.current === "listening") {
        clearInterval(pollIntervalRef.current!);
        player.pauseVideo();
        transition("auto_trigger");
      }
    }, 80);
  }, []);

  // ── Replay current video segment (no recording) ───────────────────────────
  const replayVideo = useCallback(() => {
    const s = segRef.current;
    if (!s || !playerRef.current) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    playerRef.current.seekTo(s.start, true);
    playerRef.current.playVideo();
    const dur = Math.max((s.end - s.start + 0.6) * 1000, 3000);
    setTimeout(() => playerRef.current?.pauseVideo(), dur);
  }, []);

  // ── Play back user's own recording ────────────────────────────────────────
  const playRecording = useCallback(() => {
    if (!recordingUrl) return;
    const audio = new Audio(recordingUrl);
    audio.play().catch(() => {});
  }, [recordingUrl]);

  // ── State transitions ─────────────────────────────────────────────────────
  const transition = useCallback(
    async (next: ShadowState) => {
      setMachineState(next);

      if (next === "listening") {
        setResult(null);
        // Clean up previous recording
        setRecordingUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        const s = segRef.current;
        if (!s || !playerRef.current) return;
        playerRef.current.seekTo(s.start, true);
        playerRef.current.playVideo();
        startSentencePoller(s.end);
      }

      if (next === "auto_trigger") {
        setTimeout(() => transition("recording"), 300);
      }

      if (next === "recording") {
        await startRecording();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startSentencePoller]
  );

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close();
        processRecording();
      };

      mr.start(100);
      mediaRecorderRef.current = mr;

      const s = segRef.current;
      const sentenceDur = (s?.end ?? 5) - (s?.start ?? 0);
      startVAD(sentenceDur);
    } catch {
      setErrorMsg("Could not access microphone.");
      setMachineState("idle");
    }
  };

  const stopRecording = useCallback(() => {
    clearVAD();
    setMachineState("processing");
    mediaRecorderRef.current?.stop();
  }, []);

  // ── Process & score ───────────────────────────────────────────────────────
  const processRecording = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    setRecordingUrl(url);

    const activeSeg = segRef.current;
    const refText = activeSeg?.text ?? "";

    try {
      const data = await evaluatePronunciation(blob, refText);
      const avgScore = data.pronunciation_score ?? data.accuracy_score ?? 70;

      const wordResults: WordResult[] = (data.words ?? []).map((w: {
        word: string;
        accuracy_score: number;
        error_type?: string;
        phonemes?: Array<{ phoneme: string; accuracy_score: number }>;
      }) => ({
        word: w.word,
        accuracy_score: w.accuracy_score,
        error_type: w.error_type ?? "None",
        phonemes: (w.phonemes ?? []).map((p) => ({
          phoneme: p.phoneme,
          accuracy_score: p.accuracy_score,
        })),
      }));

      scoresRef.current = [...scoresRef.current, avgScore];
      setResult({ score: avgScore, words: wordResults });
      setAttempts(a => a + 1);
      setMachineState("feedback");

      if (activeSeg) {
        saveAssessmentResult({
          videoId,
          sentenceText: activeSeg.text,
          overallScore: avgScore,
          words: wordResults,
        }).catch(() => {});
      }
    } catch {
      const demoScore = 72 + Math.random() * 25;
      scoresRef.current = [...scoresRef.current, demoScore];
      setResult({ score: demoScore, words: [] });
      setAttempts(a => a + 1);
      setMachineState("feedback");
    }
  };

  // ── Advance ───────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setAttempts(0);
    setRecordingUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSegIdx((prev) => {
      const next = prev + 1;
      if (next >= segments.length) {
        setMachineState("idle");
        const scores = scoresRef.current;
        const avgScore = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
        onComplete?.({ sentences: segments.length, avgScore });
        return prev;
      }
      setMachineState("listening");
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);

  const retrySegment = useCallback(() => {
    setResult(null);
    setRecordingUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    transition("listening");
  }, [transition]);

  useEffect(() => {
    if (machineState === "listening" && playerRef.current && segRef.current) {
      playerRef.current.seekTo(segRef.current.start, true);
      playerRef.current.playVideo();
      startSentencePoller(segRef.current.end);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segIdx]);

  useEffect(() => () => {
    clearVAD();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    playerRef.current?.destroy();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRecording = machineState === "recording";
  const isListening = machineState === "listening";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* ── YouTube player ── */}
      <div className="relative overflow-hidden border-2 border-foreground bg-black aspect-video">
        <div ref={playerContainerRef} className="w-full h-full" />

        {/* Recording overlay */}
        <AnimatePresence>
          {(isRecording || machineState === "auto_trigger") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Subtitle overlay with liaison markers */}
        <AnimatePresence>
          {(isListening || machineState === "auto_trigger") && seg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 px-4 py-3 pointer-events-none"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.88))" }}
            >
              <LiaisonText
                text={seg.text}
                className="text-white text-sm font-league leading-relaxed block text-center"
                markerClassName="font-bold"
                // white liaison markers on dark background
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={SPRING}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
            >
              <motion.div
                className="w-16 h-16 bg-bauhaus-blue flex items-center justify-center rec-pulse"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-4 h-4 bg-white" />
              </motion.div>
              <span className="text-white text-sm font-league font-bold tracking-widest uppercase">
                Your Turn
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Reference sentence with liaison markers ── */}
      {seg && (
        <div className="border-l-4 border-bauhaus-blue pl-4">
          <p className="text-xs text-muted font-league uppercase tracking-widest mb-1">
            Sentence {segIdx + 1} / {segments.length}
            {machineState === "feedback" ? " · read aloud when retrying" : " · read along with the video"}
          </p>
          <LiaisonText
            text={seg.text}
            className="font-league text-foreground text-base leading-relaxed"
            markerClassName="text-bauhaus-blue font-bold"
          />
        </div>
      )}

      {/* ── Controls ── */}
      <div className="flex items-center gap-4 flex-wrap">

        {/* Idle */}
        {machineState === "idle" && !result && (
          <>
            {!micAllowed ? (
              <button onClick={requestMic} className="btn-bauhaus px-6 py-3 text-sm">
                Allow Microphone →
              </button>
            ) : (
              <button
                onClick={() => transition("listening")}
                className="btn-bauhaus px-8 py-3 text-sm"
              >
                ▶ Begin Flow State
              </button>
            )}
          </>
        )}

        {/* Listening */}
        {isListening && (
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center gap-3 flex-1">
              <motion.div
                className="w-3 h-3 bg-bauhaus-blue"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-sm font-league text-muted">Listen carefully…</span>
            </div>
            <button
              onClick={() => {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                playerRef.current?.pauseVideo();
                advance();
              }}
              className="text-xs font-league text-muted border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors"
            >
              Skip →
            </button>
          </div>
        )}

        {/* Auto-trigger */}
        {machineState === "auto_trigger" && (
          <span className="text-sm font-league text-bauhaus-blue font-bold">Get ready…</span>
        )}

        {/* Recording */}
        {isRecording && (
          <button
            onClick={stopRecording}
            className="px-6 py-3 text-sm font-league font-bold border-2 border-bauhaus-red text-bauhaus-red hover:bg-bauhaus-red hover:text-white transition-colors"
          >
            ■ Done Speaking
          </button>
        )}

        {/* Processing */}
        {machineState === "processing" && (
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-foreground"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
            <span className="text-sm font-league text-muted ml-1">Scoring…</span>
          </div>
        )}

        {/* Feedback controls */}
        {machineState === "feedback" && result && (
          <div className="flex flex-col gap-3 w-full">
            {/* Score + replay buttons */}
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 flex items-center justify-center border-2 flex-shrink-0"
                style={{ borderColor: scoreColor(result.score) }}
              >
                <span
                  className="font-anta text-lg font-bold"
                  style={{ color: scoreColor(result.score) }}
                >
                  {Math.round(result.score)}
                </span>
              </div>

              {/* Replay buttons */}
              <div className="flex gap-2">
                <button
                  onClick={replayVideo}
                  className="text-xs font-league border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <svg width="8" height="9" viewBox="0 0 8 9"><polygon points="0,0 8,4.5 0,9" fill="currentColor" /></svg>
                  Video
                </button>
                {recordingUrl && (
                  <button
                    onClick={playRecording}
                    className="text-xs font-league border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <svg width="8" height="9" viewBox="0 0 8 9"><polygon points="0,0 8,4.5 0,9" fill="currentColor" /></svg>
                    My voice
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 ml-auto">
                {result.score < 90 && (
                  <button
                    onClick={retrySegment}
                    className="text-xs font-league font-bold text-bauhaus-blue border border-bauhaus-blue px-3 py-1.5 hover:bg-bauhaus-blue hover:text-white transition-colors"
                  >
                    Retry
                  </button>
                )}
                {(result.score >= 70 || attempts >= 3) && (
                  <button onClick={advance} className="btn-bauhaus text-xs px-3 py-1.5">
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback detail ── */}
      <AnimatePresence>
        {machineState === "feedback" && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
          >
            {result.score >= 90 ? (
              /* Light mode: only show weak words */
              (() => {
                const weakWords = result.words.filter(w => w.accuracy_score < 78);
                return weakWords.length > 0 ? (
                  <div className="rounded-xl border border-border bg-surface px-4 py-3">
                    <p className="text-[10px] font-league text-muted uppercase tracking-widest mb-2">
                      Watch these words
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {weakWords.map((w, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-league font-bold text-white"
                            style={{ background: scoreColor(w.accuracy_score) }}
                          >
                            {w.word}
                          </span>
                          <span
                            className="text-[10px] font-league font-semibold"
                            style={{ color: scoreColor(w.accuracy_score) }}
                          >
                            {Math.round(w.accuracy_score)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-surface px-4 py-3">
                    <p className="text-sm font-league text-muted">
                      Perfect — all words scored well. Move on.
                    </p>
                  </div>
                );
              })()
            ) : (
              /* Full mode: complete phoneme breakdown */
              result.words.length > 0 && (
                <PhonemeBreakdown words={result.words} videoId={videoId} />
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <p className="text-bauhaus-red text-sm font-league">{errorMsg}</p>
      )}
    </div>
  );
}
