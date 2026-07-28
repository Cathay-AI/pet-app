"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PetSprite from "@/components/PetSprite";
import PixelIcon from "@/components/PixelIcon";
import PixelRoom from "@/components/PixelRoom";
import { FEED_COOLDOWN_MS, FEED_FULL_THRESHOLD, FOODS, PLAY_COOLDOWN_MS } from "@/lib/constants";
import { HOME_HIT_AREAS } from "@/lib/homeAssets";
import {
  canPlay,
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
import { loadCurrentNekoData, saveCurrentNekoData } from "@/lib/nekoRepository";
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
  const [showStatus, setShowStatus] = useState(false);
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
  const baseAnimation = getPetMoodState(pet, now);
  const animation = actionAnimation ?? baseAnimation;
  const petCanWalk = !actionAnimation && !pet.isSick && animation !== "sleeping";
  const spriteAnimation: PetAnimation = petCanWalk ? "walking" : animation;
  const feedLeft = remainingCooldown(pet.lastFedAt, FEED_COOLDOWN_MS, now);
  const playLeft = remainingCooldown(pet.lastPlayAt, PLAY_COOLDOWN_MS, now);
  const feedBlockedReason = getFeedBlockedReason(pet, feedLeft);
  const canFeedNow = !feedBlockedReason;
  const poopVisible = needsPoopCleanup(pet);
  const deadlines = getCareDeadlines(pet, now);
  const nextDeadline = deadlines[0];
  const score = healthScore(pet);

  function feed(food: Food) {
    if (!canFeedNow) {
      setMessage(feedBlockedReason);
      setShowFood(false);
      return;
    }
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

  function handlePetTap() {
    setShowFood(false);
    setShowStatus(false);
    if (pet.isSick) {
      setMessage(`${pet.name} 需要先治療。`);
      return;
    }
    if (poopVisible) {
      cleanPoop();
      return;
    }
    if (!canPlay(pet, now)) {
      setMessage(`${pet.name} 剛剛玩過，現在想休息一下。`);
      return;
    }
    play();
  }

  function handleToyTap() {
    setShowFood(false);
    setShowStatus(false);
    if (pet.isSick) {
      setMessage(`${pet.name} 先治療，再陪牠玩。`);
      return;
    }
    if (!canPlay(pet, now)) {
      setMessage(`${pet.name} 還在休息，${formatCooldown(playLeft)}後再玩。`);
      return;
    }
    play();
  }

  function openFoodSelection() {
    setShowStatus(false);
    if (pet.isSick) {
      setMessage(feedBlockedReason || `${pet.name} 先治療，再慢慢吃東西。`);
      return;
    }
    setShowFood((value) => !value);
  }

  function openMenu() {
    setShowFood(false);
    setShowStatus(false);
    setMessage("選單會放任務、商店、好友與排行。");
  }

  function openDoor() {
    setShowFood(false);
    setShowStatus(false);
    setMessage("外出探索準備中，之後會從這扇門出發。");
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
    <main className="min-h-screen bg-[#F4D9B0] pb-24 text-[#3D2B1F]">
      <div className="mx-auto min-h-[calc(100svh-5.75rem)] max-w-md bg-[#F8E1BC] shadow-[0_0_0_1px_rgba(61,43,31,.08)]">
        <section className="relative min-h-[calc(100svh-5.75rem)] overflow-hidden">
          <PixelRoom cleanliness={pet.cleanliness} hunger={pet.hunger} mood={pet.mood} />
          <StageEffectOverlay key={effectSeed} effect={stageEffect} foodIcon={flyingFood} />

          <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 pt-5">
            <button
              type="button"
              onClick={openMenu}
              className="grid h-16 w-16 place-items-center rounded-full border-[5px] border-[#3D2B1F] bg-[#8A5A32] shadow-[4px_4px_0_rgba(61,43,31,.3)]"
              aria-label="開啟選單"
            >
              <span className="space-y-1.5">
                <span className="block h-1.5 w-8 bg-[#F8D99A]" />
                <span className="block h-1.5 w-8 bg-[#F8D99A]" />
                <span className="block h-1.5 w-8 bg-[#F8D99A]" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFood(false);
                setShowStatus((value) => !value);
              }}
              className={`home-status-orb grid h-[4.25rem] w-[4.25rem] place-items-center rounded-full border-[5px] border-[#8A5A32] shadow-[4px_4px_0_rgba(61,43,31,.28)] ${getStatusOrbClass(score, pet.isSick)}`}
              aria-label="寵物狀態"
              aria-expanded={showStatus}
            >
              <span className="relative block h-8 w-8">
                <span className="absolute left-3 top-1 h-6 w-2 bg-white" />
                <span className="absolute left-1 top-3 h-2 w-6 bg-white" />
              </span>
            </button>
          </header>

          {showStatus ? (
            <div className="absolute right-4 top-[6rem] z-40 w-64 rounded-md border-4 border-[#3D2B1F] bg-[#FFF8EA] p-4 shadow-[5px_5px_0_rgba(61,43,31,.28)]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#8B6F5E]">目前狀態</p>
                  <p className="text-xl font-black leading-none">{score} 分</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatus(false)}
                  className="rounded border-2 border-[#3D2B1F] bg-[#F5E6C8] px-2 py-1 text-xs font-black"
                >
                  關閉
                </button>
              </div>
              <StatusDetail label="飽足" value={pet.hunger} />
              <StatusDetail label="清潔" value={pet.cleanliness} />
              <StatusDetail label="心情" value={pet.mood} />
              <p className="mt-3 rounded bg-[#F5E6C8] px-3 py-2 text-xs font-black leading-tight text-[#8B6F5E]">
                下一次：{nextDeadline.label}，{formatCountdown(nextDeadline.remainingMs)}
              </p>
            </div>
          ) : null}

          <div className="absolute left-5 top-[5.8rem] z-30 max-w-[12rem] rounded-md border-2 border-[#8A5A32] bg-[#FFF4D8]/90 px-3 py-2 shadow-[3px_3px_0_rgba(61,43,31,.2)]">
            <p className="text-xs font-black leading-tight text-[#8B6F5E]">{data.user.username} 的 Neko</p>
            <h1 className="text-2xl font-black leading-none tracking-normal text-[#3D2B1F]">
              {pet.name}
            </h1>
          </div>

          {poopVisible && !pet.isSick ? (
            <button
              type="button"
              onClick={cleanPoop}
              className="poop-cleanup-button absolute bottom-36 left-7 z-30 grid h-16 w-16 place-items-center rounded-full border-4 border-[#E24B4A] bg-[#FFE0DA] text-xl shadow-[4px_4px_0_#3D2B1F]"
              aria-label="清便便"
            >
              <span className="poop-cleanup-smell poop-cleanup-smell-1" />
              <span className="poop-cleanup-smell poop-cleanup-smell-2" />
              <span className="poop-cleanup-smell poop-cleanup-smell-3" />
              <PixelIcon name="poop" size="lg" />
            </button>
          ) : null}
          <div className="relative z-10 min-h-[calc(100svh-5.75rem)]">
            <div className={actionAnimation === "eating" ? "food-flight" : ""}>
              {actionAnimation === "eating" && flyingFood ? <PixelIcon name={flyingFood} size="lg" /> : null}
            </div>
            <button
              type="button"
              onClick={openDoor}
              className={HOME_HIT_AREAS.door}
              aria-label="外出探索"
            />
            <div className="pet-walk-area">
              <button
                type="button"
                onClick={handlePetTap}
                className={`pet-walker ${petCanWalk ? "pet-walker-walk" : "pet-walker-rest"} rounded-md outline-none focus-visible:ring-4 focus-visible:ring-[#F7D46A]/80`}
                aria-label={`摸摸${pet.name}`}
              >
                <PetSprite
                  type={pet.type}
                  color={pet.color}
                  animation={spriteAnimation}
                  cleanliness={pet.cleanliness}
                  size={340}
                />
              </button>
            </div>
            <p className="absolute bottom-[7.6rem] left-1/2 z-30 max-w-[17rem] -translate-x-1/2 rounded-md border-2 border-[#3D2B1F] bg-[#FFF8EA] px-4 py-2 text-center text-sm font-black text-[#3D2B1F] shadow-[3px_3px_0_rgba(61,43,31,.25)]">
              {message || petStatusText(pet, now)}
            </p>
            <button
              type="button"
              onClick={openFoodSelection}
              className={HOME_HIT_AREAS.foodBowl}
              aria-label="選擇食物"
              aria-expanded={showFood}
            />
            <button
              type="button"
              onClick={handleToyTap}
              className={HOME_HIT_AREAS.toy}
              aria-label="陪寵物玩"
            />
          </div>

        {pet.isSick ? (
          <button
            type="button"
            onClick={treat}
            className="absolute bottom-36 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md border-4 border-[#3D2B1F] bg-[#E24B4A] px-4 py-3 text-base font-black text-white shadow-[4px_4px_0_#3D2B1F]"
          >
            治療
          </button>
        ) : null}

        {showFood ? (
          <section className="absolute inset-x-4 bottom-24 z-40 grid grid-cols-2 gap-2 rounded-md border-4 border-[#3D2B1F] bg-[#FFF4D8] p-3 shadow-[4px_4px_0_rgba(61,43,31,.35)]">
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

function StatusDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2 grid grid-cols-[3rem_1fr_2.5rem] items-center gap-2 text-xs font-black">
      <span>{label}</span>
      <span className="h-3 overflow-hidden rounded-full border-2 border-[#D4A96A] bg-[#F5E6C8]">
        <span
          className={`block h-full ${value < 30 ? "bg-[#E24B4A]" : value < 60 ? "bg-[#F7D46A]" : "bg-[#5DCAA5]"}`}
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="text-right">{value}%</span>
    </div>
  );
}

function getStatusOrbClass(score: number, isSick: boolean) {
  if (isSick || score < 35) return "bg-[#E24B4A]";
  if (score < 65) return "bg-[#F7D46A]";
  return "bg-[#6DE0CF]";
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
