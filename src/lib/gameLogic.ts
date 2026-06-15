import {
  BATH_COOLDOWN_MS,
  DECAY_PER_HOUR,
  HUNGER_ATTENTION_THRESHOLD,
  HUNGER_DANGER_THRESHOLD,
  PLAY_COOLDOWN_MS,
  SICK_GRACE_MS
} from "@/lib/constants";
import type { LeaderboardEntry, Pet, PetAnimation } from "@/types";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export type CareDeadline = {
  id: "hunger-low" | "poop" | "dirty" | "mood-low" | "sick";
  label: string;
  detail: string;
  at: Date;
  remainingMs: number;
  severity: "watch" | "risk" | "critical";
};

export function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function healthScore(input: Pick<Pet | LeaderboardEntry, "hunger" | "cleanliness" | "mood" | "isSick">) {
  const base = (input.hunger + input.cleanliness + input.mood) / 3;
  return Math.round(input.isSick ? base * 0.5 : base);
}

export function decayPet(pet: Pet, now = new Date()) {
  const updatedAt = new Date(pet.updatedAt);
  const elapsedHours = Math.max(0, now.getTime() - updatedAt.getTime()) / HOUR_MS;
  if (elapsedHours <= 0) return pet;

  const hunger = clampStat(pet.hunger - DECAY_PER_HOUR.hunger * elapsedHours);
  const cleanliness = clampStat(pet.cleanliness - DECAY_PER_HOUR.cleanliness * elapsedHours);
  const mood = clampStat(pet.mood - DECAY_PER_HOUR.mood * elapsedHours);
  const hasZero = hunger === 0 || cleanliness === 0 || mood === 0;
  const zeroSinceAt = hasZero ? pet.zeroSinceAt ?? now.toISOString() : null;
  const zeroDuration = zeroSinceAt ? now.getTime() - new Date(zeroSinceAt).getTime() : 0;

  return {
    ...pet,
    hunger,
    cleanliness,
    mood,
    zeroSinceAt,
    isSick: pet.isSick || zeroDuration >= SICK_GRACE_MS,
    updatedAt: now.toISOString()
  };
}

export function carePet(pet: Pet, changes: Partial<Pick<Pet, "hunger" | "cleanliness" | "mood">>, now = new Date()) {
  const next = {
    ...decayPet(pet, now),
    hunger: clampStat(changes.hunger ?? pet.hunger),
    cleanliness: clampStat(changes.cleanliness ?? pet.cleanliness),
    mood: clampStat(changes.mood ?? pet.mood),
    updatedAt: now.toISOString()
  };

  const hasZero = next.hunger === 0 || next.cleanliness === 0 || next.mood === 0;
  return {
    ...next,
    zeroSinceAt: hasZero ? next.zeroSinceAt ?? now.toISOString() : null
  };
}

export function getPetMoodState(pet: Pet): PetAnimation {
  if (pet.isSick || pet.hunger === 0 || pet.cleanliness === 0 || pet.mood === 0) return "sick";
  if (pet.hunger < 40 || pet.cleanliness < 40 || pet.mood < 40) return "sad";
  if (pet.hunger > 70 && pet.cleanliness > 70 && pet.mood > 70) return "happy";
  return "idle";
}

export function petStatusText(pet: Pet) {
  if (pet.isSick) return `${pet.name} 生病了，需要治療`;
  if (pet.hunger === 0 || pet.cleanliness === 0 || pet.mood === 0) return `${pet.name} 很虛弱`;
  if (pet.hunger < HUNGER_DANGER_THRESHOLD) return `${pet.name} 肚子很餓`;
  if (pet.cleanliness < 20) return `${pet.name} 需要洗香香`;
  if (pet.hunger < 40 || pet.cleanliness < 40 || pet.mood < 40) return `${pet.name} 有點難過`;
  if (pet.hunger > 70 && pet.cleanliness > 70 && pet.mood > 70) return `${pet.name} 很開心`;
  return `${pet.name} 正在看著你`;
}

export function needsPoopCleanup(pet: Pet) {
  return pet.cleanliness < 50;
}

export function canBath(pet: Pet, now = new Date()) {
  return !pet.lastBathAt || now.getTime() - new Date(pet.lastBathAt).getTime() >= BATH_COOLDOWN_MS;
}

export function canPlay(pet: Pet, now = new Date()) {
  return !pet.lastPlayAt || now.getTime() - new Date(pet.lastPlayAt).getTime() >= PLAY_COOLDOWN_MS;
}

export function remainingCooldown(lastAt: string | null, cooldownMs: number, now = new Date()) {
  if (!lastAt) return 0;
  return Math.max(0, cooldownMs - (now.getTime() - new Date(lastAt).getTime()));
}

export function formatCooldown(ms: number) {
  if (ms <= 0) return "";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} 分`;
  return minutes > 0 ? `${hours} 小時 ${minutes} 分` : `${hours} 小時`;
}

export function formatCountdown(ms: number) {
  if (ms <= MINUTE_MS) return "現在";
  const totalMinutes = Math.ceil(ms / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} 分後`;
  if (minutes === 0) return `${hours} 小時後`;
  return `${hours} 小時 ${minutes} 分後`;
}

export function getCareDeadlines(pet: Pet, now = new Date()): CareDeadline[] {
  const current = decayPet(pet, now);
  const deadlines: CareDeadline[] = [
    deadlineForStat({
      id: "hunger-low",
      label: "快餓了",
      detail: "回來餵牠",
      value: current.hunger,
      threshold: HUNGER_ATTENTION_THRESHOLD,
      decayPerHour: DECAY_PER_HOUR.hunger,
      severity: current.hunger <= HUNGER_DANGER_THRESHOLD ? "critical" : "watch",
      now
    }),
    deadlineForStat({
      id: "poop",
      label: "地板快髒了",
      detail: "回來整理房間",
      value: current.cleanliness,
      threshold: 50,
      decayPerHour: DECAY_PER_HOUR.cleanliness,
      severity: "watch",
      now
    }),
    deadlineForStat({
      id: "dirty",
      label: "想洗澡",
      detail: "回來幫牠洗乾淨",
      value: current.cleanliness,
      threshold: 20,
      decayPerHour: DECAY_PER_HOUR.cleanliness,
      severity: "risk",
      now
    }),
    deadlineForStat({
      id: "mood-low",
      label: "想你陪牠",
      detail: "回來陪牠玩一下",
      value: current.mood,
      threshold: 40,
      decayPerHour: DECAY_PER_HOUR.mood,
      severity: "watch",
      now
    })
  ];

  const zeroTimes = [
    timeUntilThreshold(current.hunger, 0, DECAY_PER_HOUR.hunger),
    timeUntilThreshold(current.cleanliness, 0, DECAY_PER_HOUR.cleanliness),
    timeUntilThreshold(current.mood, 0, DECAY_PER_HOUR.mood)
  ];
  const zeroMs = Math.min(...zeroTimes);
  deadlines.push({
    id: "sick",
    label: "不能再拖太久",
    detail: "回來照顧牠",
    at: new Date(now.getTime() + zeroMs + SICK_GRACE_MS),
    remainingMs: zeroMs + SICK_GRACE_MS,
    severity: "critical"
  });

  return deadlines.sort((a, b) => a.remainingMs - b.remainingMs);
}

export function formatRelativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes}分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function deadlineForStat({
  id,
  label,
  detail,
  value,
  threshold,
  decayPerHour,
  severity,
  now
}: {
  id: CareDeadline["id"];
  label: string;
  detail: string;
  value: number;
  threshold: number;
  decayPerHour: number;
  severity: CareDeadline["severity"];
  now: Date;
}) {
  const remainingMs = timeUntilThreshold(value, threshold, decayPerHour);
  return {
    id,
    label,
    detail,
    at: new Date(now.getTime() + remainingMs),
    remainingMs,
    severity
  };
}

function timeUntilThreshold(value: number, threshold: number, decayPerHour: number) {
  if (value <= threshold) return 0;
  return ((value - threshold) / decayPerHour) * HOUR_MS;
}
