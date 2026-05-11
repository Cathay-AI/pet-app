type LandingPageProps = {
  onStart: () => void;
};

const steps = [
  { title: "設定目標", body: "輸入想完成的存錢目標與截止日期。", icon: "🎯" },
  { title: "每天紀錄進度", body: "用小額存款或少花一筆來累積成長。", icon: "📝" },
  { title: "解鎖寵物成長與造型", body: "完成任務拿 coins，讓 Neko 越來越有精神。", icon: "✨" }
];

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white/70 shadow-soft backdrop-blur">
      <div className="grid gap-5 p-5 sm:gap-8 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
        <div className="flex flex-col justify-center">
          <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-5xl lg:text-6xl">
            養一隻會陪你完成目標的虛擬夥伴
          </h1>
          <p className="mt-4 max-w-xl text-base font-medium leading-7 text-ink/68 sm:mt-5 sm:text-lg sm:leading-8">
            設定存錢目標、完成每日任務、讓寵物成長並解鎖獎勵
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <button
              className="rounded-lg bg-mint-600 px-6 py-3 text-base font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-mint-500 focus-ring"
              onClick={onStart}
              type="button"
            >
              開始設定目標
            </button>
            <div className="hidden rounded-lg bg-white px-4 py-3 text-sm font-bold text-ink/65 shadow-card sm:block">
              MVP：單一存錢目標 · localStorage
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink/50">今日夥伴</p>
                <p className="mt-1 text-xl font-black sm:text-2xl">日本旅遊基金</p>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-mint-100 text-3xl sm:h-16 sm:w-16 sm:text-4xl">🐱</div>
            </div>
            <div className="mt-5 rounded-lg bg-mint-50 p-4 sm:mt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink/55">目前進度</p>
                  <p className="mt-1 text-2xl font-black sm:text-3xl">42%</p>
                </div>
                <p className="rounded-lg bg-white px-3 py-2 text-sm font-black text-mint-600 shadow-card">🪙 120</p>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full w-[42%] rounded-full bg-mint-500" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
              {["今天存下 300 元", "少買一杯飲料", "記錄一筆消費"].map((task) => (
                <div key={task} className="rounded-lg bg-white p-3 text-sm font-bold text-ink/70 shadow-card">
                  {task}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-t border-white/80 bg-white/55 p-4 sm:grid-cols-3 sm:gap-3 sm:p-6">
        {steps.map((step, index) => (
          <article className="rounded-lg bg-white p-3 shadow-card sm:p-4" key={step.title}>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-honey/20 text-lg sm:h-10 sm:w-10 sm:text-xl">{step.icon}</span>
              <span className="text-xs font-black text-mint-600">STEP {index + 1}</span>
            </div>
            <h2 className="mt-3 text-base font-black sm:mt-4 sm:text-lg">{step.title}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/60">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
