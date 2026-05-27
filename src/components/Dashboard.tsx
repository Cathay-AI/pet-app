import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AchievementList from "@/components/AchievementList";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import PetCard, { ANIMATION_DURATION_MS } from "@/components/PetCard";
import ProgressModal from "@/components/ProgressModal";
import RewardShop from "@/components/RewardShop";
import { applyProgressRecord, formatCurrency, getDailySuggestedAmount, getProgressPercent } from "@/lib/gameLogic";
import { getEmotionSpeech, getNekoEmotion } from "@/lib/nekoEmotion";
import type { AppData, ProgressRecord } from "@/types";

const JUST_RECORDED_MS = 2 * 60 * 1000;

type DashboardProps = {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
};

export default function Dashboard({ data, setData }: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [explorePanel, setExplorePanel] = useState<SecondaryPanel | null>(null);
  const [justRecorded, setJustRecorded] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<string | null>(null);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goal = data.goal;
  const percent = getProgressPercent(goal);
  const suggestedAmount = useMemo(() => getDailySuggestedAmount(goal), [goal]);
  const nextUnlock = getNextRoomUnlock(goal?.currentAmount ?? 0, goal?.targetAmount ?? 0);

  const emotion = celebratingMilestone
    ? "celebrating"
    : getNekoEmotion(data.userState.lastRecordDate ?? null, data.userState.streak, justRecorded);

  const [feedback, setFeedback] = useState(() =>
    getEmotionSpeech(getNekoEmotion(data.userState.lastRecordDate ?? null, data.userState.streak, false))
  );

  useEffect(() => {
    return () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
      if (recordedTimer.current) clearTimeout(recordedTimer.current);
    };
  }, []);

  const handleCelebrationDone = useCallback(() => setCelebratingMilestone(null), []);

  if (!goal) return null;

  function handleAddRecord(record: ProgressRecord) {
    const previousPercent = getProgressPercent(data.goal);
    const previousAchievements = new Set(data.userState.unlockedAchievementIds);
    const result = applyProgressRecord(data, record);
    const newPercent = getProgressPercent(result.data.goal);
    const unlockedNow = result.data.userState.unlockedAchievementIds.find((id) => !previousAchievements.has(id));

    setData(result.data);
    setFeedback(result.feedback);
    if (unlockedNow) setAchievementToast("成就解鎖！");
    setIsModalOpen(false);

    // Emotion: excited for 2 minutes
    setJustRecorded(true);
    if (recordedTimer.current) clearTimeout(recordedTimer.current);
    recordedTimer.current = setTimeout(() => setJustRecorded(false), JUST_RECORDED_MS);

    // Milestone celebration
    const crossed = roomMilestones.find((m) => previousPercent < m.percent && newPercent >= m.percent);
    if (crossed) setCelebratingMilestone(crossed.label);

    if (animationTimer.current) clearTimeout(animationTimer.current);
    setIsAnimating(true);
    animationTimer.current = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION_MS);
  }

  return (
    <section className="grid gap-4 sm:gap-5">
      {celebratingMilestone ? (
        <CelebrationOverlay milestone={celebratingMilestone} onDone={handleCelebrationDone} />
      ) : null}

      <PetCard
        data={data}
        emotion={emotion}
        feedback={feedback}
        isAnimating={isAnimating}
        nextUnlockLabel={nextUnlock.label}
        nextUnlockMeta={nextUnlock.meta}
        onAddProgress={() => setIsModalOpen(true)}
        suggestedAmount={formatCurrency(suggestedAmount)}
      />

      <section className="ritual-strip">
        <div>
          <p className="text-xs font-semibold text-ink/48">今日儀式</p>
          <p className="mt-1 text-lg font-bold text-ink">存下 {formatCurrency(suggestedAmount)}，看 Neko 的反應</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:w-[24rem]">
          <MiniStat label="Streak" value={`${data.userState.streak} 天`} />
          <MiniStat label="Coins" value={`${data.userState.coins}`} />
          <MiniStat label="完成" value={`${percent}%`} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="quiet-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">下一個小窩變化</h2>
              <p className="mt-1 text-sm font-medium text-ink/58">把長期進度先集中在房間，而不是一次攤開所有系統。</p>
            </div>
            <span className="rounded-lg bg-[#f4ecdc] px-3 py-2 text-sm font-bold text-ink">{nextUnlock.meta}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
            {roomMilestones.map((item) => {
              const unlocked = percent >= item.percent;
              return <RoomMilestone active={item.label === nextUnlock.label} key={item.label} label={item.label} percent={item.percent} unlocked={unlocked} />;
            })}
          </div>
        </section>

        <section className="quiet-panel p-4 sm:p-5">
          <h2 className="text-xl font-bold">目標細節</h2>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
            <Metric label="目前" value={formatCurrency(goal.currentAmount)} />
            <Metric label="目標" value={formatCurrency(goal.targetAmount)} />
          </div>
          <div className="mt-4 rounded-lg bg-[#f0f8f3] p-4">
            <p className="text-sm font-bold text-mint-600">{goal.name}</p>
            <p className="mt-1 text-sm font-medium leading-6 text-ink/58">財務數字保留在次層，首頁主角仍是 Neko 的狀態和房間變化。</p>
          </div>
        </section>
      </div>

      <section>
        <ExploreTabs activePanel={explorePanel} onChange={setExplorePanel} />
        {explorePanel ? (
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
        ) : null}
      </section>

      <ProgressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddRecord} suggestedAmount={suggestedAmount} />
    </section>
  );
}

type SecondaryPanel = "room" | "rewards" | "memories";

const roomMilestones = [
  { label: "窗邊植物", percent: 15 },
  { label: "存錢罐", percent: 30 },
  { label: "柔光地毯", percent: 50 },
  { label: "旅行地圖", percent: 75 }
];

function getNextRoomUnlock(currentAmount: number, targetAmount: number) {
  if (targetAmount <= 0) {
    return { label: "窗邊植物", meta: "建立目標後開始解鎖" };
  }

  const percent = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const next = roomMilestones.find((item) => percent < item.percent);

  if (!next) {
    return { label: "小窩完成", meta: "所有核心變化已解鎖" };
  }

  const unlockAmount = Math.ceil((targetAmount * next.percent) / 100);
  const remaining = Math.max(0, unlockAmount - currentAmount);

  return {
    label: next.label,
    meta: `再存 ${formatCurrency(remaining)} 解鎖`
  };
}

function ExploreTabs({
  activePanel,
  onChange
}: {
  activePanel: SecondaryPanel | null;
  onChange: (panel: SecondaryPanel | null) => void;
}) {
  const tabs = [
    { id: "room" as const, label: "收藏" },
    { id: "rewards" as const, label: "獎勵" },
    { id: "memories" as const, label: "回憶" }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#efe7d8] p-1" role="tablist" aria-label="Neko secondary views">
      {tabs.map((tab) => (
        <button
          aria-selected={activePanel === tab.id}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition focus-ring ${
            activePanel === tab.id ? "bg-ink text-white" : "text-ink/58"
          }`}
          key={tab.id}
          onClick={() => onChange(activePanel === tab.id ? null : tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-[0.68rem] font-semibold uppercase text-ink/42">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function RoomMilestone({ active, label, percent, unlocked }: { active: boolean; label: string; percent: number; unlocked: boolean }) {
  return (
    <article className={`rounded-lg border p-4 ${active ? "border-mint-500 bg-[#f0f8f3]" : unlocked ? "border-[#e6dccb] bg-white" : "border-[#eadfcd] bg-white/64"}`}>
      <div className={`h-2 w-10 rounded-full ${unlocked ? "bg-mint-600" : active ? "bg-honey" : "bg-[#d8cdbb]"}`} />
      <h3 className="mt-4 text-base font-bold text-ink">{label}</h3>
      <p className="mt-1 text-sm font-medium text-ink/52">{unlocked ? "已加入小窩" : `${percent}% 解鎖`}</p>
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
    <section className="quiet-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">小窩正在長大</h2>
          <p className="mt-1 text-sm font-medium text-ink/58">長期成長先集中在房間，不把所有功能一次攤開。</p>
        </div>
        <span className="rounded-lg bg-[#f0f8f3] px-3 py-2 text-sm font-bold text-mint-600">{data.userState.coins} coins</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {roomItems.map((item) => (
          <article className={`rounded-lg border p-3 ${item.unlocked ? "border-[#e2d8c8] bg-white" : "border-[#eee3d0] bg-white/58"}`} key={item.label}>
            <div className={`h-2 w-8 rounded-full ${item.unlocked ? "bg-mint-600" : "bg-[#d8cdbb]"}`} />
            <h3 className="mt-3 text-sm font-bold">{item.label}</h3>
            <p className={`mt-1 text-xs font-semibold ${item.unlocked ? "text-mint-600" : "text-ink/38"}`}>
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
    <div className="quiet-panel p-4 sm:p-5">
      <h2 className="text-xl font-bold">最近紀錄</h2>
      <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
        {records.length === 0 ? (
          <p className="rounded-lg bg-[#f0f8f3] p-4 text-sm font-medium text-ink/60">還沒有紀錄。新增第一筆後，Neko 會開始成長。</p>
        ) : (
          records.slice(0, 3).map((record) => (
            <div className="rounded-lg bg-white p-3 sm:p-4" key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{formatCurrency(record.amount)}</p>
                  <p className="mt-1 text-sm font-medium text-ink/55">{record.note || "沒有備註"}</p>
                </div>
                <span className="rounded-lg bg-[#f0f8f3] px-2 py-1 text-xs font-bold text-mint-600">{record.type}</span>
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
    <div className={`rounded-lg bg-white p-3 sm:p-4 ${className}`}>
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 break-words text-base font-bold sm:text-lg">{value}</p>
    </div>
  );
}
