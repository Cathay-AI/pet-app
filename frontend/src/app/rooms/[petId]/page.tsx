"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import DirtyRoomSignal from "@/components/DirtyRoomSignal";
import PetCanvas from "@/components/PetCanvas";
import PixelRoom from "@/components/PixelRoom";
import StatusBar from "@/components/StatusBar";
import { formatRelativeTime, getPetMoodState, healthScore, petStatusText } from "@/lib/gameLogic";
import { loadCurrentNekoData, loadPublicRoom, visitPet } from "@/lib/nekoRepository";
import type { LeaderboardEntry, Pet } from "@/types";

export default function PublicRoomPage() {
  const router = useRouter();
  const params = useParams<{ petId: string }>();
  const petId = useMemo(() => decodeURIComponent(params.petId), [params.petId]);
  const [entry, setEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visitMsg, setVisitMsg] = useState("");
  const [visiting, setVisiting] = useState(false);
  const [jumpAnim, setJumpAnim] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadCurrentNekoData()
      .then((loaded) => {
        if (loaded.auth.isConfigured && !loaded.auth.userId) {
          router.replace("/login");
          return null;
        }
        return loadPublicRoom(petId, loaded.data);
      })
      .then((room) => {
        if (room === null) return;
        if (!isMounted) return;
        setEntry(room);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [petId, router]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FDF8F0] text-sm font-black text-[#3D2B1F]">
        正在走去房間...
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
        <div className="mx-auto max-w-md rounded-md border-4 border-[#3D2B1F] bg-white p-5 shadow-[6px_6px_0_#3D2B1F]">
          <p className="text-sm font-black text-[#8B6F5E]">房間不見了</p>
          <h1 className="mt-1 text-2xl font-black">找不到這位朋友</h1>
          <button
            type="button"
            onClick={() => router.push("/leaderboard")}
            className="mt-5 rounded-md border-4 border-[#3D2B1F] bg-[#E8734A] px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_#3D2B1F]"
          >
            回排行
          </button>
        </div>
        <BottomNav />
      </main>
    );
  }

  const pet = entryToPet(entry);
  const score = healthScore(entry);
  const animation = getPetMoodState(pet);

  return (
    <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
      <div className="mx-auto max-w-md">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#8B6F5E]">{entry.username} 的房間</p>
            <h1 className="truncate text-3xl font-black">{entry.petName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/leaderboard"
              className="rounded-md border-4 border-[#3D2B1F] bg-white px-3 py-2 text-xs font-black shadow-[3px_3px_0_#3D2B1F] active:translate-y-1"
            >
              回排行
            </Link>
            <div className="rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] px-3 py-2 text-right shadow-[3px_3px_0_#3D2B1F]">
              <p className="text-[11px] font-black text-[#8B6F5E]">健康分</p>
              <p className={`text-xl font-black ${score < 40 ? "text-[#E24B4A]" : "text-[#3D2B1F]"}`}>{score}</p>
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-md border-4 border-[#3D2B1F] bg-[#1A1A2E] p-5 shadow-[6px_6px_0_#3D2B1F]">
          <PixelRoom cleanliness={entry.cleanliness} hunger={entry.hunger} mood={entry.mood} />
          <div className="relative z-10 min-h-72">
            <div className="pet-walk-area">
              <div className={`pet-walker ${jumpAnim ? "pet-visit-jump" : entry.isSick ? "pet-walker-rest" : "pet-walker-walk"} rounded-md`}>
                <PetCanvas
                  type={entry.petType}
                  color={entry.petColor}
                  animation={jumpAnim ? "happy" : entry.isSick ? "sick" : animation === "sick" ? "sad" : "walking"}
                  hunger={entry.hunger}
                  cleanliness={entry.cleanliness}
                  size={160}
                />
              </div>
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-[#FDF8F0] px-3 py-2 text-center text-sm font-black text-[#3D2B1F]">
              {petStatusText(pet)}
            </p>
          </div>
          {entry.cleanliness < 50 && !entry.isSick ? <DirtyRoomSignal veryDirty={entry.cleanliness < 25} /> : null}
        </section>

        <section className="mt-5 rounded-md border-4 border-[#D4A96A] bg-white p-4 shadow-[4px_4px_0_#D4A96A]">
          <div className="mb-4 grid grid-cols-[1fr_auto] items-start gap-3 rounded-md border-2 border-[#3D2B1F] bg-[#FDF8F0] p-3">
            <div>
              <p className="text-xs font-black text-[#8B6F5E]">拜訪中</p>
              <p className="text-sm font-black leading-tight">
                {entry.isSelf ? "這是你自己的房間。" : "摸摸牠，讓牠開心一點。"}
              </p>
            </div>
            <p className="rounded border-2 border-[#3D2B1F] bg-[#F5E6C8] px-2 py-1 text-xs font-black text-[#8B6F5E]">
              {entry.lastCareAt ? formatRelativeTime(entry.lastCareAt) : "尚未照顧"}
            </p>
          </div>
          <div className="space-y-3">
            <StatusBar label="飽足" value={entry.hunger} color={entry.hunger < 30 ? "coral" : "mint"} />
            <StatusBar label="清潔" value={entry.cleanliness} color={entry.cleanliness < 30 ? "coral" : "mint"} />
            <StatusBar label="心情" value={entry.mood} color={entry.mood < 30 ? "coral" : "lavender"} />
          </div>
          {entry.isSelf ? (
            <Link
              href="/home"
              className="mt-4 block rounded-md border-4 border-[#3D2B1F] bg-[#E8734A] px-4 py-3 text-center text-sm font-black text-white shadow-[4px_4px_0_#3D2B1F]"
            >
              回家照顧牠
            </Link>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                disabled={visiting}
                onClick={async () => {
                  setVisiting(true);
                  setVisitMsg("");
                  const { data, error } = await visitPet(petId);
                  if (error) {
                    setVisitMsg(error);
                  } else if (data) {
                    setJumpAnim(true);
                    setTimeout(() => setJumpAnim(false), 2000);
                    setVisitMsg(`${entry.petName} 開心地蹭了蹭你！(心情 +${data.pet_mood_boost}) 今日已摸 ${data.visits_today}/3`);
                    setEntry((prev) => prev ? { ...prev, mood: Math.min(100, prev.mood + data.pet_mood_boost) } : prev);
                  }
                  setVisiting(false);
                }}
                className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#7F77DD] px-4 py-3 text-center text-sm font-black text-white shadow-[4px_4px_0_#3D2B1F] active:translate-y-1 disabled:opacity-50"
              >
                {visiting ? "摸摸中..." : "摸摸牠"}
              </button>
              {visitMsg ? (
                <p className="mt-2 rounded-md border-2 border-[#D4A96A] bg-[#FDF8F0] px-3 py-2 text-center text-xs font-black text-[#3D2B1F]">
                  {visitMsg}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function entryToPet(entry: LeaderboardEntry): Pet {
  return {
    id: entry.id,
    userId: "",
    name: entry.petName,
    type: entry.petType,
    color: entry.petColor,
    hunger: entry.hunger,
    cleanliness: entry.cleanliness,
    mood: entry.mood,
    isSick: entry.isSick,
    zeroSinceAt: null,
    lastFedAt: null,
    lastBathAt: null,
    lastPlayAt: null,
    updatedAt: entry.lastCareAt ?? new Date().toISOString()
  };
}
