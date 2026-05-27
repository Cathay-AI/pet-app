"use client";

import { getPetStatus, getProgressPercent, getSelectedSkin } from "@/lib/gameLogic";
import type { AppData } from "@/types";

const GIF_SRC = "/cat.gif";
const ANIMATION_DURATION_MS = 3000;

type PetCardProps = {
  data: AppData;
  feedback: string;
  isAnimating: boolean;
  onAddProgress: () => void;
  nextUnlockLabel: string;
  nextUnlockMeta: string;
  suggestedAmount: string;
};

export default function PetCard({
  data,
  feedback,
  isAnimating,
  nextUnlockLabel,
  nextUnlockMeta,
  onAddProgress,
  suggestedAmount
}: PetCardProps) {
  const percent = getProgressPercent(data.goal);
  const petStatus = getPetStatus(percent);
  const skin = getSelectedSkin(data.userState);
  const roomLevel = Math.max(1, Math.min(5, Math.floor(percent / 22) + 1));

  return (
    <article className={`neko-shell ${isAnimating ? "room-glow" : ""}`}>
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-4">
        <div className="relative overflow-hidden rounded-lg bg-[#e4d1ae]">
          <div className="absolute left-3 top-3 z-10 flex gap-2 sm:left-4 sm:top-4">
            <StatusPill label={`小窩 Lv. ${roomLevel}`} />
            <StatusPill label={skin.name} muted />
          </div>
          <div className="absolute right-3 top-3 z-10 rounded-lg bg-[#233038]/88 px-3 py-2 text-xs font-semibold text-white sm:right-4 sm:top-4">
            {petStatus.tone}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Neko in the savings room"
            className={`aspect-[557/313] h-full min-h-[18rem] w-full object-cover sm:min-h-[25rem] ${isAnimating ? "pet-bounce" : ""}`}
            src={GIF_SRC}
          />
          <p aria-live="polite" className="speech-bubble">
            {feedback}
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-lg bg-[#fffaf0] p-4 sm:p-5">
          <div>
            <p className="text-sm font-bold text-mint-600">今天照顧 Neko</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-ink sm:text-4xl">存下今日一筆</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-ink/66">完成後，Neko 的小窩會往下一個變化前進。</p>
          </div>

          <div className="rounded-lg border border-[#e8dcc6] bg-white p-4">
            <p className="text-xs font-semibold text-ink/45">今日行動</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-black text-ink">{suggestedAmount}</p>
              <p className="text-sm font-semibold text-mint-600">一次就好</p>
            </div>
          </div>

          <button
            className="rounded-lg bg-ink px-5 py-4 text-base font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-ink/92 focus-ring"
            onClick={onAddProgress}
            type="button"
          >
            存下今日一筆
          </button>

          <div className="rounded-lg bg-[#f4ecdc] p-4">
            <p className="text-xs font-semibold text-ink/45">下一個小窩變化</p>
            <p className="mt-2 text-lg font-bold text-ink">{nextUnlockLabel}</p>
            <p className="mt-1 text-sm font-medium text-ink/62">{nextUnlockMeta}</p>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs font-semibold text-ink/50">
              <span>目標旅程</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e4dccf]">
              <div className="h-full rounded-full bg-mint-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium text-ink/58">{petStatus.label}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusPill({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span className={`rounded-lg px-3 py-2 text-xs font-bold shadow-card ${muted ? "bg-white/82 text-ink/62" : "bg-white text-mint-600"}`}>
      {label}
    </span>
  );
}

export { ANIMATION_DURATION_MS };
