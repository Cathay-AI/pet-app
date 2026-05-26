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
      <div className="p-4 sm:p-6">
        <div className="relative h-56 w-full overflow-hidden rounded-lg bg-gradient-to-b from-amber-50 to-amber-100 sm:h-72">
          <div className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-xs font-black text-mint-600 shadow-card">
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

        <div className="mt-4">
          <p className="text-sm font-black text-mint-600">Pet Status</p>
          <h2 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{petStatus.label}</h2>
          <p className="mt-3 rounded-lg bg-white px-3 py-2.5 text-sm font-bold leading-6 text-ink/68 shadow-card sm:px-4 sm:py-3">{feedback}</p>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs font-black text-ink/50">
            <span>{data.goal?.name ?? "目標"}</span>
            <span>{percent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-mint-100">
            <div className="h-full rounded-full bg-gradient-to-r from-mint-500 to-honey transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <button
          className="mt-4 w-full rounded-lg bg-ink px-5 py-3.5 text-base font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-ink/90 focus-ring"
          onClick={onAddProgress}
          type="button"
        >
          新增今日進度
        </button>
      </div>
    </article>
  );
}

export { ANIMATION_DURATION_MS };
