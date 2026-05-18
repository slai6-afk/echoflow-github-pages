"use client";

import type { SVGProps } from "react";

type IconName = "phoneme" | "interference" | "shadowing";

interface LineIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

function BaseSvg({
  children,
  size,
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

function PhonemeIcon({ size, className }: { size: number; className?: string }) {
  return (
    <BaseSvg size={size} className={className}>
      <circle cx="19" cy="45" r="9" />
      <circle cx="28" cy="36" r="14" />
      <circle cx="40" cy="25" r="18" />
      <path d="M10 52 54 8" />
    </BaseSvg>
  );
}

function InterferenceIcon({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <BaseSvg size={size} className={className}>
      <path d="M32 7 53 20v24L32 57 11 44V20L32 7Z" />
      <path d="M32 7v50M11 20l42 24M53 20 11 44" />
      <circle cx="32" cy="32" r="5" />
    </BaseSvg>
  );
}

function ShadowingIcon({ size, className }: { size: number; className?: string }) {
  return (
    <BaseSvg size={size} className={className}>
      <circle cx="32" cy="32" r="8" />
      <circle cx="32" cy="32" r="17" />
      <circle cx="32" cy="32" r="26" />
      <path d="M32 6v52M6 32h52" />
    </BaseSvg>
  );
}

export default function LineIcon({
  name,
  size = 36,
  className = "text-foreground",
}: LineIconProps) {
  if (name === "phoneme") return <PhonemeIcon size={size} className={className} />;
  if (name === "interference")
    return <InterferenceIcon size={size} className={className} />;
  return <ShadowingIcon size={size} className={className} />;
}
