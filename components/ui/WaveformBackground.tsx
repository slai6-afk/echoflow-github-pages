"use client";

import { useEffect, useRef } from "react";

export default function WaveformBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let tick = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tick += 0.006;

      const barCount = 72;
      const barWidth = canvas.width / barCount;
      const centerY = canvas.height * 0.54;

      for (let i = 0; i < barCount; i++) {
        const phase = (i / barCount) * Math.PI * 4 + tick;
        const height =
          Math.sin(phase) * 42 +
          Math.sin(phase * 2.1) * 18 +
          Math.sin(phase * 0.68) * 22;
        const alpha = 0.06 + Math.abs(Math.sin(phase * 0.5)) * 0.06;

        const mix = (Math.sin(phase * 0.6) + 1) / 2;
        const r = Math.round(230 - mix * 60);
        const g = Math.round(120 - mix * 40);
        const b = Math.round(185 + mix * 45);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(
          i * barWidth + barWidth * 0.15,
          centerY - Math.abs(height),
          barWidth * 0.7,
          Math.abs(height) * 2,
          3
        );
        ctx.fill();
      }

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
