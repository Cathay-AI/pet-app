import { initialNekoData } from "@/lib/constants";
import { normalizeNekoData } from "@/lib/petCollection";
import type { NekoData } from "@/types";

const STORAGE_KEY = "neko-virtual-pet-data";

export function loadNekoData(): NekoData {
  if (typeof window === "undefined") return initialNekoData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialNekoData;
    const parsed = JSON.parse(raw) as Partial<NekoData>;
    const normalized = normalizeNekoData(parsed);
    if (!normalized.user || !normalized.pet) return initialNekoData;

    return normalized;
  } catch {
    return initialNekoData;
  }
}

export function saveNekoData(data: NekoData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeNekoData(data)));
}

export function clearNekoData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
