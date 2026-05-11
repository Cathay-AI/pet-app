import { FormEvent, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/gameLogic";
import type { ProgressRecord } from "@/types";

type ProgressModalProps = {
  isOpen: boolean;
  suggestedAmount: number;
  onClose: () => void;
  onSubmit: (record: ProgressRecord) => void;
};

const progressTypes: Array<{ value: ProgressRecord["type"]; label: string }> = [
  { value: "saved_money", label: "存入金額" },
  { value: "reduced_spending", label: "少花一筆" },
  { value: "manual_adjustment", label: "手動調整" }
];

export default function ProgressModal({ isOpen, suggestedAmount, onClose, onSubmit }: ProgressModalProps) {
  const [amount, setAmount] = useState("300");
  const [note, setNote] = useState("今天少喝手搖飲");
  const [type, setType] = useState<ProgressRecord["type"]>("saved_money");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("請輸入大於 0 的有效金額。");
      return;
    }

    onSubmit({
      id: crypto.randomUUID(),
      amount: parsedAmount,
      note: note.trim(),
      type,
      createdAt: new Date().toISOString()
    });
    setAmount("300");
    setNote("今天少喝手搖飲");
    setType("saved_money");
    setError("");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/35 px-3 py-3 backdrop-blur-sm sm:place-items-center sm:px-4 sm:py-6" role="dialog" aria-modal="true">
      <form className="w-full max-w-lg rounded-lg bg-white p-4 shadow-soft sm:p-6" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">新增存錢紀錄</h2>
            <p className="mt-2 text-sm font-bold text-ink/55">超過每日建議 {formatCurrency(suggestedAmount)} 可額外 +20 coins。</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg bg-mint-50 text-lg font-black focus-ring" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4">
          <label className="grid gap-2 text-sm font-black">
            金額
            <input className="rounded-lg border border-mint-100 px-4 py-3 font-semibold focus-ring" min="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-black">
            備註
            <input className="rounded-lg border border-mint-100 px-4 py-3 font-semibold focus-ring" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-black">
            類型
            <select className="rounded-lg border border-mint-100 px-4 py-3 font-semibold focus-ring" value={type} onChange={(event) => setType(event.target.value as ProgressRecord["type"])}>
              {progressTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-coral/15 px-4 py-3 text-sm font-bold">{error}</p> : null}

        <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
          <button className="rounded-lg bg-mint-600 px-5 py-3 font-black text-white shadow-card transition hover:bg-mint-500 focus-ring" type="submit">
            送出紀錄
          </button>
          <button className="rounded-lg bg-mint-50 px-5 py-3 font-black text-ink shadow-card focus-ring" onClick={onClose} type="button">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
