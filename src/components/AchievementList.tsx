import { useEffect } from "react";
import { achievements } from "@/lib/constants";
import type { AppData } from "@/types";

type AchievementListProps = {
  data: AppData;
  toast: string | null;
  onToastDone: () => void;
};

export default function AchievementList({ data, toast, onToastDone }: AchievementListProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onToastDone, 2200);
    return () => window.clearTimeout(timer);
  }, [toast, onToastDone]);

  return (
    <section className="card relative p-4 sm:p-5">
      {toast ? (
        <div className="absolute right-3 top-3 rounded-lg bg-ink px-3 py-2 text-sm font-black text-white shadow-card sm:right-4 sm:top-4 sm:px-4">
          {toast}
        </div>
      ) : null}
      <h2 className="text-xl font-black">成就</h2>
      <p className="mt-1 text-sm font-bold text-ink/55">解鎖里程碑會讓目標更有感。</p>

      <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3">
        {achievements.map((achievement) => {
          const unlocked = data.userState.unlockedAchievementIds.includes(achievement.id);
          return (
            <article
              className={`rounded-lg border p-3 shadow-card sm:p-4 ${
                unlocked ? "border-mint-100 bg-white" : "border-white bg-white/52"
              }`}
              key={achievement.id}
            >
              <div className="flex items-start gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg sm:h-10 sm:w-10 sm:text-xl ${unlocked ? "bg-honey/25" : "bg-slate-100 grayscale"}`}>
                  {unlocked ? "🏆" : "🔒"}
                </span>
                <div>
                  <h3 className="font-black">{achievement.name}</h3>
                  <p className="mt-1 text-sm font-semibold leading-5 text-ink/55">{achievement.condition}</p>
                  <p className={`mt-2 text-xs font-black ${unlocked ? "text-mint-600" : "text-ink/38"}`}>
                    {unlocked ? "已解鎖" : "未解鎖"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
