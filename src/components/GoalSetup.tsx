import { FormEvent, useMemo, useState } from "react";
import type { Goal } from "@/types";

type GoalSetupProps = {
  onCreateGoal: (goal: Goal) => void;
  onBack: () => void;
};

export default function GoalSetup({ onCreateGoal, onBack }: GoalSetupProps) {
  const defaultDeadline = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().slice(0, 10);
  }, []);
  const [name, setName] = useState("日本旅遊基金");
  const [targetAmount, setTargetAmount] = useState("100000");
  const [currentAmount, setCurrentAmount] = useState("10000");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const target = Number(targetAmount);
    const current = Number(currentAmount);

    if (!name.trim() || !deadline || target <= 0 || current < 0) {
      setError("請確認目標名稱、金額與截止日期都已正確填寫。");
      return;
    }

    onCreateGoal({
      id: crypto.randomUUID(),
      name: name.trim(),
      targetAmount: target,
      currentAmount: Math.min(current, target),
      deadline,
      createdAt: new Date().toISOString()
    });
  }

  return (
    <section className="mx-auto max-w-3xl">
      <button className="mb-4 rounded-lg bg-white px-4 py-2 text-sm font-bold shadow-card focus-ring" onClick={onBack} type="button">
        返回介紹
      </button>
      <form className="card p-5 sm:p-8" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">建立你的存錢目標</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/58">先設定一個清楚目標，Neko 會每天陪你把進度補上。</p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 place-items-center rounded-lg bg-mint-100 text-4xl sm:grid">🐣</div>
        </div>

        <div className="mt-5 grid gap-4 sm:mt-7">
          <label className="grid gap-2 text-sm font-black">
            目標名稱
            <input className="rounded-lg border border-mint-100 bg-white px-4 py-3 font-semibold focus-ring" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-black">
              目標金額
              <input className="rounded-lg border border-mint-100 bg-white px-4 py-3 font-semibold focus-ring" min="1" type="number" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-black">
              目前已存金額
              <input className="rounded-lg border border-mint-100 bg-white px-4 py-3 font-semibold focus-ring" min="0" type="number" value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-black">
            截止日期
            <input className="rounded-lg border border-mint-100 bg-white px-4 py-3 font-semibold focus-ring" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-coral/15 px-4 py-3 text-sm font-bold text-ink">{error}</p> : null}

        <button className="mt-7 w-full rounded-lg bg-mint-600 px-5 py-3 text-base font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-mint-500 focus-ring" type="submit">
          建立目標
        </button>
      </form>
    </section>
  );
}
