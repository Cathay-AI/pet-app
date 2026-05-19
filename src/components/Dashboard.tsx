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
  const [mobilePanel, setMobilePanel] = useState<"shop" | "achievements" | "records">("shop");
  const [feedback, setFeedback] = useState("很好，今天也可以用一筆小進度開始。");
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
    <section className="grid items-start gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-5">
      <div className="grid content-start gap-4 lg:gap-5">
        <PetCard data={data} feedback={feedback} isAnimating={isAnimating} onAddProgress={() => setIsModalOpen(true)} />

        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-mint-600">存錢目標</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{goal.name}</h1>
            </div>
            <div className="rounded-lg bg-honey/20 px-3 py-2 text-sm font-black text-ink sm:px-4">
              建議今日存 {formatCurrency(suggestedAmount)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
            <Metric label="目前金額" value={formatCurrency(goal.currentAmount)} />
            <Metric label="目標金額" value={formatCurrency(goal.targetAmount)} />
            <Metric label="完成百分比" value={`${percent}%`} className="col-span-2 sm:col-span-1" />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-black text-ink/50">
              <span>Progress</span>
              <span>{percent}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-mint-100">
              <div className="h-full rounded-full bg-gradient-to-r from-mint-500 to-honey transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">今日任務</h2>
            <span className="rounded-lg bg-mint-50 px-3 py-1 text-xs font-black text-mint-600">完成任一項 +10</span>
          </div>
          <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            {dailyTasks.map((task) => (
              <div className="flex items-center gap-3 rounded-lg border border-mint-100 bg-white p-3 shadow-card sm:block sm:p-4" key={task}>
                <div className="text-lg sm:text-2xl">✅</div>
                <p className="text-sm font-black leading-6 sm:mt-3">{task}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <MobilePanelTabs activePanel={mobilePanel} onChange={setMobilePanel} />
          <div className="mt-3">
            {mobilePanel === "shop" ? <RewardShop data={data} setData={setData} /> : null}
            {mobilePanel === "achievements" ? <AchievementList data={data} toast={achievementToast} onToastDone={() => setAchievementToast(null)} /> : null}
            {mobilePanel === "records" ? <RecentRecords records={data.records} /> : null}
          </div>
        </div>
      </div>

      <div className="hidden content-start gap-4 lg:grid lg:gap-5">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Metric label="Coins" value={`🪙 ${data.userState.coins}`} />
          <Metric label="Streak" value={`🔥 ${data.userState.streak} 天`} />
        </div>
        <RewardShop data={data} setData={setData} />
        <AchievementList data={data} toast={achievementToast} onToastDone={() => setAchievementToast(null)} />
        <RecentRecords records={data.records} />
      </div>

      <ProgressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddRecord} suggestedAmount={suggestedAmount} />
    </section>
  );
}

function MobilePanelTabs({
  activePanel,
  onChange
}: {
  activePanel: "shop" | "achievements" | "records";
  onChange: (panel: "shop" | "achievements" | "records") => void;
}) {
  const tabs = [
    { id: "shop" as const, label: "獎勵" },
    { id: "achievements" as const, label: "成就" },
    { id: "records" as const, label: "紀錄" }
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
      <p className="text-xs font-black uppercase text-ink/45">{label}</p>
      <p className="mt-2 break-words text-lg font-black sm:text-xl">{value}</p>
    </div>
  );
}
