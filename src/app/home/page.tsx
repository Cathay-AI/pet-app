"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import BottomNav from "@/components/BottomNav";
import PetCanvas from "@/components/PetCanvas";
import StatusBar from "@/components/StatusBar";
import { BATH_COOLDOWN_MS, FOODS, PLAY_COOLDOWN_MS } from "@/lib/constants";
import {
  canBath,
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
import { loadCurrentNekoData, saveCurrentNekoData, type AuthState } from "@/lib/nekoRepository";
import type { NekoData, Pet, PetAnimation } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<NekoData | null>(null);
  const [actionAnimation, setActionAnimation] = useState<PetAnimation | null>(null);
  const [showFood, setShowFood] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [source, setSource] = useState<"supabase" | "local">("local");

  useEffect(() => {
    loadCurrentNekoData().then((loaded) => {
      setAuth(loaded.auth);
      setSource(loaded.source);
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
      void saveCurrentNekoData(next).then(setSource);
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

  function feed(boost: number, label: string) {
    updatePet(
      (current) => {
        const decayed = decayPet(current);
        return {
          ...carePet(decayed, { hunger: decayed.hunger + boost, mood: decayed.mood + 4 }),
          lastFedAt: new Date().toISOString()
        };
      },
      true,
      "eating",
      `${pet.name} 吃了${label}`
    );
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
          <div className="flex items-center gap-2">
            <AuthStatus auth={auth} />
            <div className="rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] px-3 py-2 text-right shadow-[3px_3px_0_#3D2B1F]">
              <p className="text-[11px] font-black text-[#8B6F5E]">{source === "supabase" ? "公開健康" : "本機健康"}</p>
              <p className="text-xl font-black">{healthScore(pet)}</p>
            </div>
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
              💩
            </button>
          ) : null}
          <div className="relative z-10 grid min-h-72 place-items-center">
            <div className={actionAnimation === "eating" ? "food-flight" : ""}>{actionAnimation === "eating" ? "🍱" : ""}</div>
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
              <p className="text-xs font-black text-[#8B6F5E]">下次回來</p>
              <p className="text-sm font-black leading-tight text-[#3D2B1F]">
                {nextDeadline.label} · {nextDeadline.detail}
              </p>
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

        <section className="mt-5 grid grid-cols-4 gap-2">
          <ActionButton icon="🍱" label="餵食" onClick={() => setShowFood((value) => !value)} />
          <ActionButton icon="🛁" label="洗澡" onClick={bath} disabled={!canBath(pet)} note={bathLeft ? formatCooldown(bathLeft) : ""} />
          <ActionButton icon="💩" label="清潔" onClick={cleanPoop} disabled={!poopVisible} />
          <ActionButton icon="🎾" label="玩耍" onClick={play} disabled={!canPlay(pet)} note={playLeft ? formatCooldown(playLeft) : ""} />
        </section>

        {showFood ? (
          <section className="mt-3 grid grid-cols-2 gap-2 rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] p-3 shadow-[4px_4px_0_#3D2B1F]">
            {FOODS.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => feed(food.hungerBoost, food.label)}
                className="rounded-md border-2 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-3 text-left font-black"
              >
                <span className="mr-2">{food.icon}</span>
                {food.label}
                <span className="block text-xs text-[#8B6F5E]">飽足 +{food.hungerBoost}</span>
              </button>
            ))}
          </section>
        ) : null}
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
  icon: string;
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
      <span className="block text-2xl leading-none">{icon}</span>
      <span className="mt-2 block text-sm">{label}</span>
      {note ? <span className="mt-1 block text-[10px] leading-tight text-[#8B6F5E]">{note}</span> : null}
    </button>
  );
}
