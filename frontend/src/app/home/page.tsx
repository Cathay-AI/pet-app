"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PetCanvas from "@/components/PetCanvas";
import PixelIcon from "@/components/PixelIcon";
import PixelRoom from "@/components/PixelRoom";
import StatusBar from "@/components/StatusBar";
import { BATH_COOLDOWN_MS, FEED_COOLDOWN_MS, FEED_FULL_THRESHOLD, FOODS, PLAY_COOLDOWN_MS } from "@/lib/constants";
import {
  canBath,
  canPlay,
  type CareDeadline,
  carePet,
  decayPet,
  formatCooldown,
  formatCountdown,
  getCareDeadlines,
  getPetMoodState,
  healthScore,
  needsPoopCleanup,
  petStatusText,
  remainingCooldown
} from "@/lib/gameLogic";
import { loadCurrentNekoData, logCareEvent, saveCurrentNekoData } from "@/lib/nekoRepository";
import { upsertPet } from "@/lib/petCollection";
import type { Food, NekoData, Pet, PetAnimation, PixelIconName } from "@/types";

type StageEffect = "feed" | "bath" | "clean" | "play" | null;

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<NekoData | null>(null);
  const [actionAnimation, setActionAnimation] = useState<PetAnimation | null>(null);
  const [stageEffect, setStageEffect] = useState<StageEffect>(null);
  const [effectSeed, setEffectSeed] = useState(0);
  const [showFood, setShowFood] = useState(false);
  const [flyingFood, setFlyingFood] = useState<PixelIconName | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const actionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadCurrentNekoData().then((loaded) => {
      if (loaded.auth.isConfigured && !loaded.auth.userId) {
        router.replace("/login");
        return;
      }
      if (!loaded.data.user || !loaded.data.pet) {
        router.replace("/gacha");
        return;
      }
      setData(loaded.data);
    });
  }, [router]);

  useEffect(() => {
    if (!data?.pet) return;
    const timer = window.setInterval(() => {
      const nextNow = new Date();
      setNow(nextNow);
      updatePet((pet) => decayPet(pet, nextNow), false);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [data?.pet?.id]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    return () => {
      if (actionTimerRef.current) window.clearTimeout(actionTimerRef.current);
    };
  }, []);

  function updatePet(
    updater: (pet: Pet) => Pet,
    animate = true,
    nextAnimation: PetAnimation = "happy",
    nextMessage = "",
    nextEffect: StageEffect = null,
    durationMs = 1600
  ) {
    setNow(new Date());
    setData((current) => {
      if (!current?.pet || !current.user) return current;
      const updatedPet = updater(current.pet);
      const next = upsertPet({ ...current, pet: updatedPet, activePetId: updatedPet.id }, updatedPet);
      void saveCurrentNekoData(next);
      return next;
    });
    if (nextMessage) setMessage(nextMessage);
    if (animate) {
      if (actionTimerRef.current) window.clearTimeout(actionTimerRef.current);
      setActionAnimation(nextAnimation);
      setStageEffect(nextEffect);
      setEffectSeed((value) => value + 1);
      actionTimerRef.current = window.setTimeout(() => {
        setActionAnimation(null);
        setStageEffect(null);
        actionTimerRef.current = null;
      }, durationMs);
    }
  }

  if (!data?.user || !data.pet) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FDF8F0] text-sm font-black text-[#3D2B1F]">
        Neko 正在醒來...
      </main>
    );
  }

  const pet = data.pet;
  const baseAnimation = getPetMoodState(pet);
  const animation = actionAnimation ?? baseAnimation;
  const petCanWalk = !actionAnimation && !pet.isSick && animation !== "sleeping";
  const canvasAnimation: PetAnimation = petCanWalk ? "walking" : animation;
  const bathLeft = remainingCooldown(pet.lastBathAt, BATH_COOLDOWN_MS, now);
  const feedLeft = remainingCooldown(pet.lastFedAt, FEED_COOLDOWN_MS, now);
  const playLeft = remainingCooldown(pet.lastPlayAt, PLAY_COOLDOWN_MS, now);
  const feedBlockedReason = getFeedBlockedReason(pet, feedLeft);
  const canFeedNow = !feedBlockedReason;
  const poopVisible = needsPoopCleanup(pet);
  const deadlines = getCareDeadlines(pet, now);
  const nextDeadline = deadlines[0];
  const deadlinePrompt = getDeadlinePrompt(pet.name, nextDeadline);
  const recommendedAction = getRecommendedAction(nextDeadline, {
    bathLeft,
    feedBlockedReason,
    feedLeft,
    playLeft,
    poopVisible
  });

  function feed(food: Food) {
    if (!canFeedNow) {
      setMessage(feedBlockedReason);
      setShowFood(false);
      return;
    }
    void logCareEvent("feed");
    const actionNow = new Date();
    setFlyingFood(food.icon);
    updatePet(
      (current) => {
        const decayed = decayPet(current, actionNow);
        const nextHunger = Math.min(FEED_FULL_THRESHOLD, decayed.hunger + food.hungerBoost);
        return {
          ...carePet(decayed, { hunger: nextHunger, mood: decayed.mood + (food.moodBoost ?? 4) }, actionNow),
          lastFedAt: actionNow.toISOString()
        };
      },
      true,
      "eating",
      getCareReaction(pet.name, "feed", food.label),
      "feed",
      1800
    );
    window.setTimeout(() => setFlyingFood(null), 1450);
    setShowFood(false);
  }

  function bath() {
    if (!canBath(pet)) return;
    void logCareEvent("bath");
    const actionNow = new Date();
    updatePet(
      (current) => {
        const decayed = decayPet(current, actionNow);
        return {
          ...carePet(decayed, { cleanliness: decayed.cleanliness + 40 }, actionNow),
          lastBathAt: actionNow.toISOString()
        };
      },
      true,
      "bathing",
      getCareReaction(pet.name, "bath"),
      "bath",
      1900
    );
  }

  function cleanPoop() {
    if (!poopVisible) return;
    const actionNow = new Date();
    updatePet(
      (current) => {
        const decayed = decayPet(current, actionNow);
        return carePet(decayed, { cleanliness: decayed.cleanliness + 20, mood: decayed.mood + 10 }, actionNow);
      },
      true,
      "happy",
      getCareReaction(pet.name, "clean"),
      "clean",
      1700
    );
  }

  function play() {
    if (!canPlay(pet)) return;
    void logCareEvent("play");
    const actionNow = new Date();
    updatePet(
      (current) => {
        const decayed = decayPet(current, actionNow);
        return {
          ...carePet(decayed, { mood: decayed.mood + 30 }, actionNow),
          lastPlayAt: actionNow.toISOString()
        };
      },
      true,
      "happy",
      getCareReaction(pet.name, "play"),
      "play",
      1800
    );
  }

  function runRecommendedAction() {
    switch (recommendedAction.id) {
      case "feed":
        setShowFood(true);
        break;
      case "bath":
        bath();
        break;
      case "clean":
        cleanPoop();
        break;
      case "play":
        play();
        break;
      case "treat":
        treat();
        break;
    }
  }

  function treat() {
    updatePet(
      (current) => ({
        ...current,
        hunger: Math.max(current.hunger, 35),
        cleanliness: Math.max(current.cleanliness, 35),
        mood: Math.max(current.mood, 35),
        isSick: false,
        zeroSinceAt: null,
        updatedAt: new Date().toISOString()
      }),
      true,
      "happy",
      `${pet.name} 恢復精神了`
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
      <div className="mx-auto max-w-md">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-[#8B6F5E]">{data.user.username} 的 Neko</p>
            <h1 className="text-2xl font-black">{pet.name}</h1>
          </div>
          <div className="rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] px-3 py-2 text-right shadow-[3px_3px_0_#3D2B1F]">
            <p className="text-[11px] font-black text-[#8B6F5E]">健康分</p>
            <p className="text-xl font-black">{healthScore(pet)}</p>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-md border-4 border-[#3D2B1F] bg-[#1A1A2E] p-5 shadow-[6px_6px_0_#3D2B1F]">
          <PixelRoom cleanliness={pet.cleanliness} hunger={pet.hunger} mood={pet.mood} />
          <StageEffectOverlay key={effectSeed} effect={stageEffect} foodIcon={flyingFood} />
          {poopVisible && !pet.isSick ? (
            <button
              type="button"
              onClick={cleanPoop}
              className="poop-cleanup-button absolute bottom-8 left-7 z-30 grid h-16 w-16 place-items-center rounded-md border-4 border-[#E24B4A] bg-[#FFE0DA] text-xl shadow-[4px_4px_0_#3D2B1F]"
              aria-label="清便便"
            >
              <span className="poop-cleanup-smell poop-cleanup-smell-1" />
              <span className="poop-cleanup-smell poop-cleanup-smell-2" />
              <span className="poop-cleanup-smell poop-cleanup-smell-3" />
              <PixelIcon name="poop" size="lg" />
            </button>
          ) : null}
          <div className="relative z-10 min-h-72">
            <div className={actionAnimation === "eating" ? "food-flight" : ""}>
              {actionAnimation === "eating" && flyingFood ? <PixelIcon name={flyingFood} size="lg" /> : null}
            </div>
            <div className="pet-walk-area">
              <button
                type="button"
                onClick={play}
                disabled={!canPlay(pet) || pet.isSick}
                className={`pet-walker ${petCanWalk ? "pet-walker-walk" : "pet-walker-rest"} rounded-md outline-none disabled:cursor-default`}
                aria-label={`摸摸${pet.name}`}
              >
                <PetCanvas
                  type={pet.type}
                  color={pet.color}
                  animation={canvasAnimation}
                  hunger={pet.hunger}
                  cleanliness={pet.cleanliness}
                  size={160}
                />
              </button>
            </div>
            <p className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded bg-[#FDF8F0] px-3 py-2 text-center text-sm font-black text-[#3D2B1F]">
              {message || petStatusText(pet)}
            </p>
          </div>
        </section>

        <section className="mt-5 space-y-3 rounded-md border-4 border-[#D4A96A] bg-white p-4 shadow-[4px_4px_0_#D4A96A]">
          <button
            type="button"
            onClick={runRecommendedAction}
            disabled={recommendedAction.disabled}
            className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border-2 border-[#3D2B1F] p-3 text-left shadow-[3px_3px_0_#3D2B1F] transition active:translate-y-1 disabled:cursor-default disabled:opacity-70 ${
              nextDeadline.severity === "critical" ? "bg-[#FFE0DA]" : "bg-[#FDF8F0]"
            }`}
          >
            <PixelIcon name={recommendedAction.icon} size="lg" />
            <span className="min-w-0">
              <span className="block text-xs font-black text-[#8B6F5E]">下一次需要你</span>
              <span className="block text-sm font-black leading-tight text-[#3D2B1F]">{deadlinePrompt.title}</span>
              <span className="mt-1 block text-xs font-bold leading-tight text-[#8B6F5E]">
                {recommendedAction.disabled ? recommendedAction.disabledLabel : deadlinePrompt.detail}
              </span>
            </span>
            <span className="text-right">
              <span
                className={`block rounded border-2 border-[#3D2B1F] px-2 py-1 text-sm font-black ${
                  nextDeadline.severity === "critical" ? "bg-[#E24B4A] text-white" : "bg-[#F5E6C8] text-[#3D2B1F]"
                }`}
              >
                {formatCountdown(nextDeadline.remainingMs)}
              </span>
              <span className="mt-2 block text-xs font-black text-[#E8734A]">{recommendedAction.label}</span>
            </span>
          </button>
          {feedLeft > 0 ? (
            <p className="rounded bg-[#F5E6C8] px-3 py-2 text-xs font-black leading-tight text-[#8B6F5E]">
              {pet.name} 還在慢慢吃，晚點再餵就好。
            </p>
          ) : null}
          <StatusBar label="飽足" value={pet.hunger} color={pet.hunger < 30 ? "coral" : "mint"} />
          <StatusBar label="清潔" value={pet.cleanliness} color={pet.cleanliness < 30 ? "coral" : "mint"} />
          <StatusBar label="心情" value={pet.mood} color={pet.mood < 30 ? "coral" : "lavender"} />
        </section>

        {pet.isSick ? (
          <button
            type="button"
            onClick={treat}
            className="mt-4 w-full rounded-md border-4 border-[#3D2B1F] bg-[#E24B4A] px-4 py-3 text-base font-black text-white shadow-[4px_4px_0_#3D2B1F]"
          >
            治療
          </button>
        ) : null}

        {showFood ? (
          <section className="mt-5 grid grid-cols-2 gap-2 rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] p-3 shadow-[4px_4px_0_#3D2B1F]">
            {feedBlockedReason ? (
              <p className="col-span-2 rounded-md border-2 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-xs font-black text-[#8B6F5E]">
                {feedBlockedReason}
              </p>
            ) : null}
            {FOODS.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => feed(food)}
                disabled={!canFeedNow}
                className="flex items-center gap-3 rounded-md border-2 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-3 text-left font-black disabled:opacity-45"
              >
                <PixelIcon name={food.icon} size="md" />
                <span>
                  {food.label}
                  <span className="block text-xs text-[#8B6F5E]">
                    飽足 +{food.hungerBoost}
                    {food.moodBoost ? ` · 心情 +${food.moodBoost}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </section>
        ) : null}

        <section className="mt-5 grid grid-cols-4 gap-2">
          <ActionButton
            icon="feed"
            label="餵食"
            onClick={() => setShowFood((value) => !value)}
            disabled={!canFeedNow}
            note={feedLeft ? formatCooldown(feedLeft) : pet.hunger >= FEED_FULL_THRESHOLD ? "晚點再餵" : ""}
            recommended={recommendedAction.id === "feed"}
          />
          <ActionButton
            icon="bath"
            label="洗澡"
            onClick={bath}
            disabled={!canBath(pet)}
            note={bathLeft ? formatCooldown(bathLeft) : ""}
            recommended={recommendedAction.id === "bath"}
          />
          <ActionButton
            icon="poop"
            label="清潔"
            onClick={cleanPoop}
            disabled={!poopVisible}
            recommended={recommendedAction.id === "clean"}
          />
          <ActionButton
            icon="play"
            label="玩耍"
            onClick={play}
            disabled={!canPlay(pet)}
            note={playLeft ? formatCooldown(playLeft) : ""}
            recommended={recommendedAction.id === "play"}
          />
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function StageEffectOverlay({ effect, foodIcon }: { effect: StageEffect; foodIcon: PixelIconName | null }) {
  if (!effect) return null;

  return (
    <div className={`stage-effect stage-effect-${effect}`} aria-hidden="true">
      {effect === "feed" ? (
        <>
          <span className="stage-food-pop">{foodIcon ? <PixelIcon name={foodIcon} size="md" /> : null}</span>
          <span className="stage-bite stage-bite-1" />
          <span className="stage-bite stage-bite-2" />
          <span className="stage-bite stage-bite-3" />
          <span className="stage-bowl-shine" />
        </>
      ) : null}
      {effect === "bath" ? (
        <>
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={`bubble-${index}`} className={`stage-bubble stage-bubble-${index + 1}`} />
          ))}
          <span className="stage-splash stage-splash-left" />
          <span className="stage-splash stage-splash-right" />
        </>
      ) : null}
      {effect === "clean" ? (
        <>
          <span className="stage-broom" />
          <span className="stage-clean-swipe stage-clean-swipe-1" />
          <span className="stage-clean-swipe stage-clean-swipe-2" />
          <span className="stage-sparkle stage-sparkle-1" />
          <span className="stage-sparkle stage-sparkle-2" />
          <span className="stage-sparkle stage-sparkle-3" />
        </>
      ) : null}
      {effect === "play" ? (
        <>
          <span className="stage-ball" />
          <span className="stage-heart stage-heart-1" />
          <span className="stage-heart stage-heart-2" />
          <span className="stage-heart stage-heart-3" />
          <span className="stage-jump-mark stage-jump-mark-1" />
          <span className="stage-jump-mark stage-jump-mark-2" />
        </>
      ) : null}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  note = "",
  recommended = false
}: {
  icon: PixelIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  note?: string;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-24 rounded-md border-4 px-1 py-3 text-center font-black text-[#3D2B1F] shadow-[3px_3px_0_#3D2B1F] disabled:opacity-45 ${
        recommended ? "border-[#E8734A] bg-[#FFE0DA]" : "border-[#3D2B1F] bg-[#F5E6C8]"
      }`}
    >
      <span className="grid place-items-center">
        <PixelIcon name={icon} size="lg" />
      </span>
      <span className="mt-2 block text-sm">{label}</span>
      {note ? <span className="mt-1 block text-[10px] leading-tight text-[#8B6F5E]">{note}</span> : null}
    </button>
  );
}

function getDeadlinePrompt(petName: string, deadline: CareDeadline) {
  const isNow = deadline.remainingMs <= 60000;

  switch (deadline.id) {
    case "hunger-low":
      return isNow
        ? { title: `${petName} 該吃飯了`, detail: "餵牠一口，牠會安心很多。" }
        : { title: `${petName} 晚點會想吃`, detail: "晚點回來看牠，順手補一點吃的。" };
    case "poop":
      return isNow
        ? { title: "地板有點髒了", detail: "幫牠清一下，房間會舒服很多。" }
        : { title: "地板快要髒了", detail: "回來看一眼，順手幫牠整理一下。" };
    case "dirty":
      return isNow
        ? { title: `${petName} 想洗香香`, detail: "洗完牠會清爽一點，也比較有精神。" }
        : { title: `${petName} 等一下會想洗澡`, detail: "晚點回來幫牠洗乾淨。" };
    case "mood-low":
      return isNow
        ? { title: `${petName} 想你陪牠`, detail: "陪牠玩一下，心情會好很多。" }
        : { title: `${petName} 晚點會想你`, detail: "回來陪牠玩一下，別讓牠自己悶太久。" };
    case "sick":
      return isNow
        ? { title: `${petName} 真的不舒服`, detail: "先治療牠，再慢慢把狀態照顧回來。" }
        : { title: `${petName} 不能再拖太久`, detail: "再放著不管，牠會生病，健康分也會掉。" };
  }
}

type RecommendedAction = {
  id: "feed" | "bath" | "clean" | "play" | "treat";
  icon: PixelIconName;
  label: string;
  disabled: boolean;
  disabledLabel: string;
};

function getRecommendedAction(
  deadline: CareDeadline,
  state: { bathLeft: number; feedBlockedReason: string; feedLeft: number; playLeft: number; poopVisible: boolean }
): RecommendedAction {
  switch (deadline.id) {
    case "hunger-low":
      return {
        id: "feed",
        icon: "feed",
        label: state.feedLeft > 0 ? "等牠吃完" : "準備餵食",
        disabled: Boolean(state.feedBlockedReason),
        disabledLabel: state.feedBlockedReason
      };
    case "poop":
      return state.poopVisible
        ? { id: "clean", icon: "poop", label: "現在清潔", disabled: false, disabledLabel: "" }
        : { id: "bath", icon: "bath", label: "等下整理", disabled: state.bathLeft > 0, disabledLabel: "洗澡還在冷卻，晚點再幫牠整理。" };
    case "dirty":
      return {
        id: "bath",
        icon: "bath",
        label: state.bathLeft > 0 ? "稍後洗澡" : "幫牠洗澡",
        disabled: state.bathLeft > 0,
        disabledLabel: "洗澡還在冷卻，先陪牠一下也可以。"
      };
    case "mood-low":
      return {
        id: "play",
        icon: "play",
        label: state.playLeft > 0 ? "稍後陪玩" : "陪牠玩",
        disabled: state.playLeft > 0,
        disabledLabel: "剛剛才玩過，等牠休息一下。"
      };
    case "sick":
      return { id: "treat", icon: "feed", label: "先治療", disabled: false, disabledLabel: "" };
  }
}

function getFeedBlockedReason(pet: Pet, feedLeft: number) {
  if (pet.isSick) return `${pet.name} 先治療，再慢慢吃東西。`;
  if (feedLeft > 0) return `${pet.name} 還在慢慢吃，晚點再餵就好。`;
  if (pet.hunger >= FEED_FULL_THRESHOLD) return `${pet.name} 現在還不餓，晚點再餵牠。`;
  return "";
}

function getCareReaction(petName: string, action: "feed" | "bath" | "clean" | "play", foodLabel = "") {
  const reactions = {
    feed: [`${petName} 把${foodLabel}慢慢吃完了`, `${petName} 靠近碗邊，安心了一點`],
    bath: [`${petName} 甩了甩水，房間亮了一點`, `${petName} 聞起來乾乾淨淨`],
    clean: [`地板乾淨了，${petName} 坐回你身邊`, `${petName} 看起來舒服多了`],
    play: [`${petName} 跳了一下，回頭看著你`, `${petName} 玩累了，但很滿足`]
  };
  const options = reactions[action];
  return options[Math.floor(Math.random() * options.length)];
}
