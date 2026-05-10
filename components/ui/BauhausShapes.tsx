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
        <circle cx="5" cy="5" r="5" fill="#E63946" />
      </svg>
    </button>
  );
}

export function YellowTriangle({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-label="Slight mispronunciation">
      <polygon points="5,0 10,10 0,10" fill="#F4A261" />
    </svg>
  );
}

export function BlueRect({ width = 8, height = 4 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Good pronunciation">
      <rect width={width} height={height} fill="#1D3557" />
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
        <rect width="16" height="16" fill="#1D3557" />
        <polygon points="5,3 13,8 5,13" fill="white" />
      </svg>
    </button>
  );
}
