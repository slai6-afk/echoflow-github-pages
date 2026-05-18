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

      const lines = 5;
      for (let row = 0; row < lines; row++) {
        const yBase = canvas.height * (0.22 + row * 0.14);
        const amp = 16 + row * 4;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 8) {
          const phase = x * 0.008 + tick * (1 + row * 0.2);
          const y = yBase + Math.sin(phase) * amp + Math.cos(phase * 0.62) * (amp * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          row % 2 === 0
            ? `rgba(5, 5, 5, ${0.06 - row * 0.007})`
            : `rgba(27, 63, 150, ${0.08 - row * 0.01})`;
        ctx.lineWidth = 1;
        ctx.stroke();
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
