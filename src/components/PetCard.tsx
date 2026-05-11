import { getPetStatus, getProgressPercent, getSelectedSkin } from "@/lib/gameLogic";
import type { AppData } from "@/types";

type PetCardProps = {
  data: AppData;
  feedback: string;
  onAddProgress: () => void;
};

export default function PetCard({ data, feedback, onAddProgress }: PetCardProps) {
  const percent = getProgressPercent(data.goal);
  const petStatus = getPetStatus(percent);
  const skin = getSelectedSkin(data.userState);
  const displayEmoji = data.userState.selectedSkinId === "basic" ? petStatus.emoji : skin.emoji;

  return (
    <article className="relative overflow-hidden rounded-lg border border-white/75 bg-mint-50 shadow-soft">
      <div className="grid gap-4 p-4 sm:grid-cols-[0.75fr_1.25fr] sm:gap-5 sm:p-6">
        <div className="grid place-items-center rounded-lg bg-white/75 p-3 shadow-card sm:p-5">
          <div className="relative grid h-32 w-full place-items-center rounded-lg bg-gradient-to-b from-white to-mint-100 sm:h-44">
            <div className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-xs font-black text-mint-600 shadow-card sm:left-4 sm:top-4 sm:px-3">
              {skin.name}
            </div>
            <div className="text-6xl drop-shadow-sm sm:text-9xl">{displayEmoji}</div>
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
