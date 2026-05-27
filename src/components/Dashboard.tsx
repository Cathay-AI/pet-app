import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import AchievementList from "@/components/AchievementList";
import PetCard, { ANIMATION_DURATION_MS } from "@/components/PetCard";
import ProgressModal from "@/components/ProgressModal";
import RewardShop from "@/components/RewardShop";
import { dailyTasks } from "@/lib/constants";
import { applyProgressRecord, formatCurrency, getDailySuggestedAmount, getProgressPercent } from "@/lib/gameLogic";
import type { AppData, ProgressRecord } from "@/types";

type DashboardProps = {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
};

export default function Dashboard({ data, setData }: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [explorePanel, setExplorePanel] = useState<"room" | "rewards" | "memories">("room");
  const [feedback, setFeedback] = useState("Neko 在等你今天的一筆小進度。");
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goal = data.goal;
  const percent = getProgressPercent(goal);
  const suggestedAmount = useMemo(() => getDailySuggestedAmount(goal), [goal]);

  useEffect(() => {
    return () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
    };
  }, []);

  if (!goal) return null;

  function handleAddRecord(record: ProgressRecord) {
    const previousAchievements = new Set(data.userState.unlockedAchievementIds);
    const result = applyProgressRecord(data, record);
    const unlockedNow = result.data.userState.unlockedAchievementIds.find((id) => !previousAchievements.has(id));

    setData(result.data);
    setFeedback(result.feedback);
    if (unlockedNow) setAchievementToast("成就解鎖！");
    setIsModalOpen(false);

    if (animationTimer.current) clearTimeout(animationTimer.current);
    setIsAnimating(true);
    animationTimer.current = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION_MS);
  }

  return (
    <section className="grid gap-4 sm:gap-5">
      <PetCard
        data={data}
        feedback={feedback}
        isAnimating={isAnimating}
        onAddProgress={() => setIsModalOpen(true)}
        suggestedAmount={formatCurrency(suggestedAmount)}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">今日核心循環</h2>
              <p className="mt-1 text-sm font-bold text-ink/58">只做一件事，讓真實進度變成 Neko 的世界變化。</p>
            </div>
            <span className="rounded-lg bg-honey/20 px-3 py-2 text-sm font-black text-ink">🔥 {data.userState.streak} 天</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {dailyTasks.map((task, index) => (
              <DailyStep active={index === 0} key={task} label={task} step={index + 1} />
            ))}
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="text-xl font-black">目標旅程</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="現在" value={formatCurrency(goal.currentAmount)} />
            <Metric label="目標" value={formatCurrency(goal.targetAmount)} />
            <Metric label="完成" value={`${percent}%`} />
          </div>
          <div className="mt-4 rounded-lg bg-mint-50 p-4">
            <p className="text-sm font-black text-mint-600">{goal.name}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/58">
              每次紀錄都會累積 coins、更新 streak，並推進小窩等級。
            </p>
          </div>
        </section>
      </div>

      <section>
        <ExploreTabs activePanel={explorePanel} onChange={setExplorePanel} />
        <div className="mt-3">
          {explorePanel === "room" ? <RoomProgress data={data} /> : null}
          {explorePanel === "rewards" ? <RewardShop data={data} setData={setData} /> : null}
          {explorePanel === "memories" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <AchievementList data={data} toast={achievementToast} onToastDone={() => setAchievementToast(null)} />
              <RecentRecords records={data.records} />
            </div>
          ) : null}
        </div>
      </section>

      <ProgressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddRecord} suggestedAmount={suggestedAmount} />
    </section>
  );
}

function ExploreTabs({
  activePanel,
  onChange
}: {
  activePanel: "room" | "rewards" | "memories";
  onChange: (panel: "room" | "rewards" | "memories") => void;
}) {
  const tabs = [
    { id: "room" as const, label: "小窩" },
    { id: "rewards" as const, label: "獎勵" },
    { id: "memories" as const, label: "回憶" }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-white/70 p-1 shadow-card">
      {tabs.map((tab) => (
        <button
          className={`rounded-lg px-3 py-2 text-sm font-black transition focus-ring ${
            activePanel === tab.id ? "bg-ink text-white" : "text-ink/58"
          }`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function DailyStep({ active, label, step }: { active: boolean; label: string; step: number }) {
  return (
    <article className={`rounded-lg border p-3 shadow-card sm:p-4 ${active ? "border-mint-100 bg-white" : "border-white bg-white/58"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-black ${active ? "bg-mint-600 text-white" : "bg-mint-50 text-ink/45"}`}>
          {step}
        </span>
        <div>
          <p className="text-sm font-black leading-6">{label}</p>
          <p className="mt-1 text-xs font-bold text-ink/50">{active ? "今天先完成這一件" : "完成後會變成探索素材"}</p>
        </div>
      </div>
    </article>
  );
}

function RoomProgress({ data }: { data: AppData }) {
  const percent = getProgressPercent(data.goal);
  const roomItems = [
    { label: "窗邊植物", unlocked: percent >= 15 },
    { label: "存錢罐", unlocked: percent >= 30 },
    { label: "柔光地毯", unlocked: percent >= 50 },
    { label: "旅行地圖", unlocked: percent >= 75 }
  ];

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">小窩正在長大</h2>
          <p className="mt-1 text-sm font-bold text-ink/58">長期成長先集中在房間，不把所有功能一次攤開。</p>
        </div>
        <span className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-black text-mint-600">🪙 {data.userState.coins}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {roomItems.map((item) => (
          <article className={`rounded-lg p-3 shadow-card ${item.unlocked ? "bg-white" : "bg-white/48"}`} key={item.label}>
            <div className={`text-2xl ${item.unlocked ? "" : "grayscale"}`}>{item.unlocked ? "✨" : "🔒"}</div>
            <h3 className="mt-3 text-sm font-black">{item.label}</h3>
            <p className={`mt-1 text-xs font-bold ${item.unlocked ? "text-mint-600" : "text-ink/38"}`}>
              {item.unlocked ? "已加入小窩" : "繼續照顧解鎖"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecentRecords({ records }: { records: ProgressRecord[] }) {
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="text-xl font-black">最近紀錄</h2>
      <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
        {records.length === 0 ? (
          <p className="rounded-lg bg-mint-50 p-4 text-sm font-bold text-ink/60">還沒有紀錄。新增第一筆後，Neko 會開始成長。</p>
        ) : (
          records.slice(0, 3).map((record) => (
            <div className="rounded-lg bg-white p-3 shadow-card sm:p-4" key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{formatCurrency(record.amount)}</p>
                  <p className="mt-1 text-sm font-semibold text-ink/55">{record.note || "沒有備註"}</p>
                </div>
                <span className="rounded-lg bg-mint-50 px-2 py-1 text-xs font-black text-mint-600">{record.type}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg bg-white p-3 shadow-card sm:p-4 ${className}`}>
      <p className="text-xs font-black text-ink/45">{label}</p>
      <p className="mt-2 break-words text-base font-black sm:text-lg">{value}</p>
    </div>
  );
}
