"use client";

// Bauhaus primary geometric feedback shapes

export function RedCircle({ size = 10, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Play reference audio"
      className="flex items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-transform"
      style={{ width: size, height: size }}
      aria-label="Play reference audio for this phoneme"
    >
      <svg width={size} height={size} viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4.2" fill="none" stroke="#ef4f91" strokeWidth="1.2" />
      </svg>
    </button>
  );
}

export function YellowTriangle({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-label="Slight mispronunciation">
      <polygon points="5,1 9,9 1,9" fill="none" stroke="#ffd86b" strokeWidth="1.2" />
    </svg>
  );
}

export function BlueRect({ width = 8, height = 4 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Good pronunciation">
      <rect x="0.6" y="0.6" width={width - 1.2} height={height - 1.2} fill="none" stroke="#193d7a" strokeWidth="1.2" />
    </svg>
  );
}

export function PlayIcon({ size = 16, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center hover:opacity-70 active:scale-95 transition-all"
      aria-label="Play native pronunciation"
    >
      <svg width={size} height={size} viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="#193d7a" strokeWidth="1.2" />
        <polygon points="6,5 11,8 6,11" fill="#193d7a" />
      </svg>
    </button>
  );
}
