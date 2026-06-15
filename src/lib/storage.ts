import { initialNekoData } from "@/lib/constants";
import { decayPet } from "@/lib/gameLogic";
import type { NekoData, Pet, User } from "@/types";

const STORAGE_KEY = "neko-virtual-pet-data";

export function loadNekoData(): NekoData {
  if (typeof window === "undefined") return initialNekoData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialNekoData;
    const parsed = JSON.parse(raw) as Partial<NekoData>;
    if (!parsed.user || !parsed.pet) return initialNekoData;

    return {
      version: 1,
      user: parsed.user as User,
      pet: decayPet(parsed.pet as Pet)
    };
  } catch {
    return initialNekoData;
  }
}

export function saveNekoData(data: NekoData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1 }));
}

export function clearNekoData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
