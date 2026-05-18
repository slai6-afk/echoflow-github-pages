"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type BlobState = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

function nextBlobState(seed: number): BlobState {
  const base = (seed * 37) % 100;
  return {
    x: (base % 18) - 9,
    y: ((base * 1.7) % 18) - 9,
    scale: 0.9 + ((base * 0.13) % 25) / 100,
    rotate: ((base * 2.9) % 18) - 9,
  };
}

export default function FluidGradientBackground() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2600);
    return () => window.clearInterval(id);
  }, []);

  const blobs = useMemo(
    () => [
      {
        key: "blue",
        className: "fluid-blob fluid-blob-blue",
        state: nextBlobState(tick + 1),
      },
      {
        key: "red",
        className: "fluid-blob fluid-blob-red",
        state: nextBlobState(tick + 2),
      },
      {
        key: "purple",
        className: "fluid-blob fluid-blob-purple",
        state: nextBlobState(tick + 3),
      },
    ],
    [tick]
  );

  return (
    <div aria-hidden className="fluid-bg-root pointer-events-none">
      {blobs.map((blob) => (
        <motion.div
          key={blob.key}
          className={blob.className}
          animate={{
            x: `${blob.state.x}%`,
            y: `${blob.state.y}%`,
            scale: blob.state.scale,
            rotate: blob.state.rotate,
          }}
          transition={{
            type: "spring",
            stiffness: 72,
            damping: 26,
            mass: 1,
          }}
        />
      ))}
      <motion.div
        className="fluid-grid"
        animate={{ backgroundPositionX: ["0px", "36px", "0px"] }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}
