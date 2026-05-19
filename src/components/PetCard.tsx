"use client";

import { useEffect, useState } from "react";
import { getPetStatus, getProgressPercent, getSelectedSkin } from "@/lib/gameLogic";
import type { AppData } from "@/types";

const GIF_SRC = "/cat.gif";
const ANIMATION_DURATION_MS = 3000;

type PetCardProps = {
  data: AppData;
  feedback: string;
  isAnimating: boolean;
  onAddProgress: () => void;
};

export default function PetCard({ data, feedback, isAnimating, onAddProgress }: PetCardProps) {
  const percent = getProgressPercent(data.goal);
  const petStatus = getPetStatus(percent);
  const skin = getSelectedSkin(data.userState);
  const [idleFrame, setIdleFrame] = useState<string | null>(null);
  const [gifKey, setGifKey] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      setIdleFrame(canvas.toDataURL("image/png"));
    };
    img.src = GIF_SRC;
  }, []);

  // remount the img element each time animation triggers so GIF restarts from frame 1
  useEffect(() => {
    if (isAnimating) setGifKey((k) => k + 1);
  }, [isAnimating]);

  const imgSrc = isAnimating ? GIF_SRC : (idleFrame ?? GIF_SRC);

  return (
    <article className="relative overflow-hidden rounded-lg border border-white/75 bg-mint-50 shadow-soft">
      <div className="grid gap-4 p-4 sm:grid-cols-[0.75fr_1.25fr] sm:gap-5 sm:p-6">
        <div className="grid place-items-center rounded-lg bg-white/75 p-3 shadow-card sm:p-5">
          <div className="relative grid h-32 w-full place-items-center overflow-hidden rounded-lg bg-gradient-to-b from-amber-50 to-amber-100 sm:h-44">
            <div className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-xs font-black text-mint-600 shadow-card sm:left-4 sm:top-4 sm:px-3">
              {skin.name}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={gifKey}
              alt="pet cat"
              className="h-full w-full object-contain"
              src={imgSrc}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 sm:gap-5">
          <div>
            <p className="text-sm font-black text-mint-600">Pet Status</p>
            <h2 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{petStatus.label}</h2>
            <p className="mt-3 rounded-lg bg-white px-3 py-2.5 text-sm font-bold leading-6 text-ink/68 shadow-card sm:px-4 sm:py-3">{feedback}</p>
          </div>
          <button
            className="rounded-lg bg-ink px-5 py-3 text-base font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-ink/90 focus-ring"
            onClick={onAddProgress}
            type="button"
          >
            新增今日進度
          </button>
        </div>
      </div>
    </article>
  );
}

export { ANIMATION_DURATION_MS };
