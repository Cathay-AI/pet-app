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
  suggestedAmount: string;
};

export default function PetCard({ data, feedback, isAnimating, onAddProgress, suggestedAmount }: PetCardProps) {
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

  const roomLevel = Math.max(1, Math.min(5, Math.floor(percent / 22) + 1));

  return (
    <article className={`relative overflow-hidden rounded-lg border border-white/80 bg-white/76 shadow-soft ${isAnimating ? "room-glow" : ""}`}>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-5 lg:p-6">
        <div className="relative min-h-[21rem] overflow-hidden rounded-lg border border-white/80 bg-[#fff7dd] shadow-card sm:min-h-[25rem]">
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[#dca972]" />
          <div className="absolute left-1/2 top-10 h-24 w-28 -translate-x-1/2 rounded-b-full border-[10px] border-white/85 bg-sky-100 shadow-card">
            <div className="mx-auto mt-3 h-12 w-16 rounded-b-full bg-gradient-to-b from-sky-200 to-mint-100" />
          </div>
          <div className="absolute right-5 top-8 grid gap-2">
            <div className="h-3 w-24 rounded-full bg-[#9f6d4f]" />
            <div className="flex justify-end gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-lg shadow-card">🪴</span>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-lg shadow-card">🫙</span>
            </div>
          </div>
          <div className="absolute left-5 top-5 rounded-lg bg-white/92 px-3 py-2 shadow-card">
            <p className="text-xs font-black text-mint-600">小窩 Lv. {roomLevel}</p>
            <p className="text-xs font-bold text-ink/55">{skin.name}</p>
          </div>
          <div className="absolute bottom-12 left-1/2 w-[82%] -translate-x-1/2 rounded-[50%] bg-ink/10 blur-sm" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={gifKey}
            alt="Neko"
            className={`absolute bottom-12 left-1/2 h-[62%] w-[88%] -translate-x-1/2 object-contain ${isAnimating ? "pet-bounce" : ""}`}
            src={imgSrc}
          />
          <div className="absolute bottom-5 left-5 right-5 rounded-lg bg-white/90 px-4 py-3 shadow-card">
            <p className="text-sm font-black leading-6 text-ink">{feedback}</p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5">
          <div>
            <p className="text-sm font-black text-mint-600">今天照顧 Neko</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              存下今日一筆，讓小窩亮起來
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-ink/62">
              Neko 今天只需要你完成一個真實行動。完成後會得到 coins、streak，並推進房間成長。
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg bg-mint-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-ink/45">今日行動</p>
                  <p className="mt-1 font-black">存下 {suggestedAmount}</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-xl shadow-card">✨</span>
              </div>
            </div>

            <button
              className="w-full rounded-lg bg-ink px-5 py-4 text-base font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-ink/90 focus-ring"
              onClick={onAddProgress}
              type="button"
            >
              存下今日一筆
            </button>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs font-black text-ink/50">
              <span>目標旅程</span>
              <span>{percent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-mint-100">
              <div className="h-full rounded-full bg-gradient-to-r from-mint-500 via-honey to-coral transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-sm font-bold text-ink/55">{petStatus.label}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export { ANIMATION_DURATION_MS };
