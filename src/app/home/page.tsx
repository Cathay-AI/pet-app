"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PetCanvas from "@/components/PetCanvas";
import PixelIcon from "@/components/PixelIcon";
import StatusBar from "@/components/StatusBar";
import { BATH_COOLDOWN_MS, FOODS, PLAY_COOLDOWN_MS } from "@/lib/constants";
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
import { loadCurrentNekoData, saveCurrentNekoData } from "@/lib/nekoRepository";
import type { Food, NekoData, Pet, PetAnimation, PixelIconName } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<NekoData | null>(null);
  const [actionAnimation, setActionAnimation] = useState<PetAnimation | null>(null);
  const [showFood, setShowFood] = useState(false);
  const [flyingFood, setFlyingFood] = useState<PixelIconName | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date());

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

  function updatePet(updater: (pet: Pet) => Pet, animate = true, nextAnimation: PetAnimation = "happy", nextMessage = "") {
    setNow(new Date());
    setData((current) => {
      if (!current?.pet || !current.user) return current;
      const next = { ...current, pet: updater(current.pet) };
      void saveCurrentNekoData(next);
      return next;
    });
    if (nextMessage) setMessage(nextMessage);
    if (animate) {
      setActionAnimation(nextAnimation);
      window.setTimeout(() => setActionAnimation(null), 1300);
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
  const bathLeft = remainingCooldown(pet.lastBathAt, BATH_COOLDOWN_MS, now);
  const playLeft = remainingCooldown(pet.lastPlayAt, PLAY_COOLDOWN_MS, now);
  const poopVisible = needsPoopCleanup(pet);
  const deadlines = getCareDeadlines(pet, now);
  const nextDeadline = deadlines[0];
  const deadlinePrompt = getDeadlinePrompt(pet.name, nextDeadline);

  function feed(food: Food) {
    setFlyingFood(food.icon);
    updatePet(
      (current) => {
        const decayed = decayPet(current);
        return {
          ...carePet(decayed, { hunger: decayed.hunger + food.hungerBoost, mood: decayed.mood + 4 }),
          lastFedAt: new Date().toISOString()
        };
      },
      true,
      "eating",
      `${pet.name} 吃了${food.label}`
    );
    window.setTimeout(() => setFlyingFood(null), 1300);
    setShowFood(false);
  }

  function bath() {
    if (!canBath(pet)) return;
    updatePet(
      (current) => {
        const decayed = decayPet(current);
        return {
          ...carePet(decayed, { cleanliness: decayed.cleanliness + 40 }),
          lastBathAt: new Date().toISOString()
        };
      },
      true,
      "bathing",
      `${pet.name} 洗乾淨了`
    );
  }

  function cleanPoop() {
    if (!poopVisible) return;
    updatePet(
      (current) => {
        const decayed = decayPet(current);
        return carePet(decayed, { cleanliness: decayed.cleanliness + 20, mood: decayed.mood + 10 });
      },
      true,
      "happy",
      "地板乾淨了"
    );
  }

  function play() {
    if (!canPlay(pet)) return;
    updatePet(
      (current) => {
        const decayed = decayPet(current);
        return {
          ...carePet(decayed, { mood: decayed.mood + 30 }),
          lastPlayAt: new Date().toISOString()
        };
      },
      true,
      "happy",
      `${pet.name} 玩得很開心`
    );
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
            <p className="text-sm font-black text-[#8B6F5E]">{data.user.username}</p>
            <h1 className="text-2xl font-black">Neko</h1>
          </div>
          <div className="rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] px-3 py-2 text-right shadow-[3px_3px_0_#3D2B1F]">
            <p className="text-[11px] font-black text-[#8B6F5E]">健康分</p>
            <p className="text-xl font-black">{healthScore(pet)}</p>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-md border-4 border-[#3D2B1F] bg-[#1A1A2E] p-5 shadow-[6px_6px_0_#3D2B1F]">
          <div className="absolute inset-x-0 bottom-0 h-14 bg-[#2A2A46]" />
          {poopVisible && !pet.isSick ? (
            <button
              type="button"
              onClick={cleanPoop}
              className="absolute bottom-8 left-8 z-10 grid h-11 w-11 place-items-center rounded-md border-2 border-[#3D2B1F] bg-[#F5E6C8] text-xl shadow-[3px_3px_0_#3D2B1F]"
              aria-label="清便便"
            >
              <PixelIcon name="poop" size="md" />
            </button>
          ) : null}
          <div className="relative z-10 grid min-h-72 place-items-center">
            <div className={actionAnimation === "eating" ? "food-flight" : ""}>
              {actionAnimation === "eating" && flyingFood ? <PixelIcon name={flyingFood} size="lg" /> : null}
            </div>
            <PetCanvas
              type={pet.type}
              color={pet.color}
              animation={animation}
              hunger={pet.hunger}
              cleanliness={pet.cleanliness}
              size={160}
            />
            <p className="rounded bg-[#FDF8F0] px-3 py-2 text-center text-sm font-black text-[#3D2B1F]">
              {message || petStatusText(pet)}
            </p>
          </div>
        </section>

        <section className="mt-5 space-y-3 rounded-md border-4 border-[#D4A96A] bg-white p-4 shadow-[4px_4px_0_#D4A96A]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b-4 border-[#F5E6C8] pb-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-[#8B6F5E]">下一次需要你</p>
              <p className="text-sm font-black leading-tight text-[#3D2B1F]">
                {deadlinePrompt.title}
              </p>
              <p className="mt-1 text-xs font-bold leading-tight text-[#8B6F5E]">{deadlinePrompt.detail}</p>
            </div>
            <p
              className={`rounded border-2 border-[#3D2B1F] px-2 py-1 text-sm font-black ${
                nextDeadline.severity === "critical" ? "bg-[#E24B4A] text-white" : "bg-[#F5E6C8] text-[#3D2B1F]"
              }`}
            >
              {formatCountdown(nextDeadline.remainingMs)}
            </p>
          </div>
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
            {FOODS.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => feed(food)}
                className="flex items-center gap-3 rounded-md border-2 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-3 text-left font-black"
              >
                <PixelIcon name={food.icon} size="md" />
                <span>
                  {food.label}
                  <span className="block text-xs text-[#8B6F5E]">飽足 +{food.hungerBoost}</span>
                </span>
              </button>
            ))}
          </section>
        ) : null}

        <section className="mt-5 grid grid-cols-4 gap-2">
          <ActionButton icon="feed" label="餵食" onClick={() => setShowFood((value) => !value)} />
          <ActionButton icon="bath" label="洗澡" onClick={bath} disabled={!canBath(pet)} note={bathLeft ? formatCooldown(bathLeft) : ""} />
          <ActionButton icon="poop" label="清潔" onClick={cleanPoop} disabled={!poopVisible} />
          <ActionButton icon="play" label="玩耍" onClick={play} disabled={!canPlay(pet)} note={playLeft ? formatCooldown(playLeft) : ""} />
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  note = ""
}: {
  icon: PixelIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-24 rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] px-1 py-3 text-center font-black text-[#3D2B1F] shadow-[3px_3px_0_#3D2B1F] disabled:opacity-45"
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
        ? { title: `${petName} 餓了`, detail: "現在餵牠一口，牠會安心很多。" }
        : { title: `${petName} 等一下會餓`, detail: "晚點回來餵牠，別讓牠空著肚子等太久。" };
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
