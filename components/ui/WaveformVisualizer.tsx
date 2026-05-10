"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface WaveformVisualizerProps {
  analyserNode?: AnalyserNode | null;
  isActive?: boolean;
  matchScore?: number; // 0–100: how close user matches native (colors bars)
  height?: number;
  barCount?: number;
}

export default function WaveformVisualizer({
  analyserNode,
  isActive = false,
  matchScore = 0,
  height = 80,
  barCount = 40,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let tick = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = height;
      ctx.clearRect(0, 0, w, h);

      const barW = w / barCount;
      let dataArray: Uint8Array<ArrayBuffer> | null = null;

      if (analyserNode && isActive) {
        dataArray = new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        analyserNode.getByteTimeDomainData(dataArray);
      }

      // Interpolate color: grey → insight-blue as matchScore increases
      const blueAmount = matchScore / 100;
      const rBase = Math.round(80 - 80 * blueAmount + 27 * blueAmount);
      const gBase = Math.round(80 - 80 * blueAmount + 58 * blueAmount);
      const bBase = Math.round(80 - 80 * blueAmount + 140 * blueAmount);

      for (let i = 0; i < barCount; i++) {
        let barHeight: number;

        if (dataArray && isActive) {
          const sampleIdx = Math.floor((i / barCount) * dataArray.length);
          const value = (dataArray[sampleIdx] - 128) / 128;
          barHeight = Math.abs(value) * h * 0.9 + 2;
        } else {
          tick += 0.001;
          const phase = (i / barCount) * Math.PI * 3 + tick * 2;
          barHeight = (Math.sin(phase) * 0.3 + 0.3) * h * 0.35 + 2;
        }

        const alpha = isActive ? 0.8 : 0.25;
        ctx.fillStyle = `rgba(${rBase}, ${gBase}, ${bBase}, ${alpha})`;
        ctx.beginPath();
        const x = i * barW + barW * 0.1;
        const bw = barW * 0.8;
        ctx.roundRect(x, h / 2 - barHeight / 2, bw, barHeight, 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [analyserNode, isActive, matchScore, height, barCount]);

  return (
    <motion.div
      className="w-full overflow-hidden rounded-xl"
      style={{ height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height, display: "block" }}
      />
    </motion.div>
  );
}
