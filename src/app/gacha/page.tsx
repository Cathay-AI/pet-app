"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import PetCanvas from "@/components/PetCanvas";
import { COLOR_OPTIONS, PET_COLORS } from "@/lib/constants";
import { createId } from "@/lib/gameLogic";
import { getAuthState, saveCurrentNekoData, type AuthState } from "@/lib/nekoRepository";
import type { Pet, PetColorId, PetType, User } from "@/types";

export default function GachaPage() {
  const router = useRouter();
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState<PetType | null>(null);
  const [color, setColor] = useState<PetColorId>("orange");
  const [petName, setPetName] = useState("");
  const [username, setUsername] = useState("");
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    getAuthState().then(setAuth);
  }, []);

  const title = useMemo(() => {
    if (isDrawing) return "籤筒搖晃中";
    if (result) return result === "cat" ? "你抽到貓咪" : "你抽到狗狗";
    return "抽出你的像素寵物";
  }, [isDrawing, result]);

  function drawPet() {
    setIsDrawing(true);
    window.setTimeout(() => {
      setResult(Math.random() >= 0.5 ? "cat" : "dog");
      setIsDrawing(false);
    }, 1500);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || !petName.trim() || !username.trim()) return;

    const now = new Date().toISOString();
    const user: User = {
      id: auth?.userId ?? createId("user"),
      username: username.trim(),
      createdAt: now
    };
    const pet: Pet = {
      id: createId("pet"),
      userId: user.id,
      name: petName.trim(),
      type: result,
      color,
      hunger: 78,
      cleanliness: 82,
      mood: 76,
      isSick: false,
      zeroSinceAt: null,
      lastFedAt: null,
      lastBathAt: null,
      lastPlayAt: null,
      updatedAt: now
    };

    await saveCurrentNekoData({ version: 1, user, pet });
    router.replace("/home");
  }

  return (
    <main className="min-h-screen bg-[#090912] px-5 py-8 text-[#FDF8F0]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <section className="rounded-md border-4 border-[#FDF8F0] bg-[#121225] p-5 text-center shadow-[8px_8px_0_#E8734A]">
          <div className="mb-4 flex justify-end">
            <AuthStatus auth={auth} mode="dark" />
          </div>
          <h1 className="text-2xl font-black">{title}</h1>
          <div className="my-8 grid place-items-center">
            {result ? (
              <div className="rounded-md bg-[#1A1A2E] p-6 shadow-[inset_0_0_0_4px_#2E2E52]">
                <PetCanvas type={result} color={color} animation="happy" />
              </div>
            ) : (
              <div
                className={`grid h-40 w-40 place-items-center rounded-md border-4 border-[#D4A96A] bg-[#1A1A2E] text-6xl shadow-[0_0_34px_rgba(212,169,106,.55)] ${
                  isDrawing ? "animate-[gacha-shake_120ms_linear_infinite]" : ""
                }`}
                aria-label="發光籤筒"
              >
                筒
              </div>
            )}
          </div>

          {!result ? (
            <button
              type="button"
              onClick={drawPet}
              disabled={isDrawing}
              className="w-full rounded-md border-4 border-[#FDF8F0] bg-[#E8734A] px-5 py-4 text-lg font-black text-white shadow-[4px_4px_0_#3D2B1F] disabled:opacity-60"
            >
              抽！
            </button>
          ) : (
            <form className="space-y-5 text-left" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-black">選擇顏色</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      aria-label={PET_COLORS[option].name}
                      className={`h-10 rounded-full border-4 ${color === option ? "border-white" : "border-[#3D2B1F]"}`}
                      style={{ backgroundColor: PET_COLORS[option].fur }}
                    />
                  ))}
                </div>
              </div>
              <label className="block text-sm font-black">
                寵物名稱
                <input
                  value={petName}
                  onChange={(event) => setPetName(event.target.value)}
                  maxLength={12}
                  className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
                  placeholder="Kiki"
                />
              </label>
              <label className="block text-sm font-black">
                你的名稱
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  maxLength={12}
                  className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
                  placeholder="Jason"
                />
              </label>
              <button
                type="submit"
                disabled={!petName.trim() || !username.trim()}
                className="w-full rounded-md border-4 border-[#FDF8F0] bg-[#E8734A] px-5 py-4 text-lg font-black text-white shadow-[4px_4px_0_#3D2B1F] disabled:opacity-60"
              >
                出發！
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
