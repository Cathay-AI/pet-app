"use client";

import { useEffect } from "react";

const CONFETTI_COLORS = ["#7BC8A4", "#E8734A", "#D4A96A", "#ffffff", "#7BC8A4", "#E8734A"];

type Props = {
  milestone: string;
  onDone: () => void;
};

export default function CelebrationOverlay({ milestone, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/75 backdrop-blur-sm"
      role="dialog"
      onClick={onDone}
    >
      <div className="celebration-burst text-center px-6">
        <p className="text-sm font-bold text-white/65 mb-3">小窩新變化解鎖</p>
        <p className="text-4xl font-black text-white leading-tight sm:text-5xl">{milestone}</p>
        <p className="mt-4 text-base font-semibold text-white/75">Neko 的家又往前走了一步</p>
      </div>

      {CONFETTI_COLORS.map((color, i) => (
        <span
          className={`confetti confetti-delay-${i}`}
          key={i}
          style={{
            left: `${6 + i * 14}%`,
            background: color,
            animationDelay: `${i * 0.12}s`
          }}
        />
      ))}

      <p className="absolute bottom-8 text-xs font-semibold text-white/40">輕觸繼續</p>
    </div>
  );
}
