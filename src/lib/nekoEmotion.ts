import { toDateKey } from "@/lib/gameLogic";

export type NekoEmotion = "greeting" | "excited" | "celebrating" | "happy" | "neutral" | "sad" | "sleepy";

export function getNekoEmotion(
  lastRecordDate: string | null,
  streak: number,
  justRecorded: boolean,
  now = new Date()
): NekoEmotion {
  if (justRecorded) return "excited";

  const today = toDateKey(now);
  const hour = now.getHours();

  if (lastRecordDate === today) return "happy";
  if (hour >= 23) return "sleepy";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const hadYesterday = lastRecordDate === toDateKey(yesterday);

  if (!hadYesterday && streak === 0) return "sad";
  return "neutral";
}

export function getEmotionSpeech(emotion: NekoEmotion): string {
  switch (emotion) {
    case "greeting": return "剛睡醒… 今天有什麼計畫嗎？";
    case "happy": return "今天已經有記錄了，繼續保持！";
    case "sad": return "好久沒看到你了… Neko 有點擔心你。";
    case "sleepy": return "快睡著了… 今天還沒記錄嗎？";
    default: return "Neko 在等你今天的一筆進度。";
  }
}

export function getEmotionLabel(emotion: NekoEmotion): string {
  switch (emotion) {
    case "greeting": return "剛醒來";
    case "excited": return "非常開心";
    case "celebrating": return "解鎖成功";
    case "happy": return "心情很好";
    case "sad": return "有點擔心";
    case "sleepy": return "快睡著了";
    default: return "在等你";
  }
}

export function getEmotionFilter(emotion: NekoEmotion): string {
  switch (emotion) {
    case "sad": return "grayscale(35%) brightness(0.9)";
    case "sleepy": return "brightness(0.82) saturate(0.5)";
    case "happy": return "brightness(1.04) saturate(1.1)";
    case "excited":
    case "celebrating": return "brightness(1.08) saturate(1.2)";
    default: return "";
  }
}
