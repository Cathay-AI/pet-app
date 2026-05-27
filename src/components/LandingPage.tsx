type LandingPageProps = {
  onStart: () => void;
};

const steps = [
  { title: "設定一個目標", body: "先選一件真的想完成的事，讓它成為 Neko 的旅程。" },
  { title: "每天一筆進度", body: "打開後只做一件事：存下今日一筆或記錄少花的一筆。" },
  { title: "看小窩變化", body: "進度會變成房間解鎖、Neko 回饋與長期陪伴感。" }
];

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <section className="neko-shell">
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="relative overflow-hidden rounded-lg bg-[#e4d1ae]">
          <div className="absolute left-4 top-4 z-10 rounded-lg bg-white px-3 py-2 text-xs font-bold text-mint-600 shadow-card">Neko</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Neko room preview" className="aspect-[557/313] min-h-[18rem] w-full object-cover sm:min-h-[25rem]" src="/cat.gif" />
          <p className="speech-bubble">Neko 會把你的真實進度，變成每天想回來看的小窩變化。</p>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-lg bg-[#fffaf0] p-4 sm:p-5">
          <div>
            <p className="text-sm font-bold text-mint-600">人生目標養成遊戲</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-ink sm:text-4xl">每天照顧 Neko，一起完成目標</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-ink/66">
              不是管理一堆 dashboard。你只需要完成今天的一個行動，Neko 的狀態和房間就會慢慢改變。
            </p>
          </div>

          <div className="rounded-lg border border-[#e8dcc6] bg-white p-4">
            <p className="text-xs font-semibold text-ink/45">今日核心循環</p>
            <p className="mt-2 text-lg font-bold text-ink">存下今日一筆 → Neko 回應 → 小窩前進</p>
          </div>

          <button
            className="rounded-lg bg-ink px-5 py-4 text-base font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-ink/92 focus-ring"
            onClick={onStart}
            type="button"
          >
            建立我的目標
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-t border-[#eadfcd] bg-[#fffaf0] p-4 sm:grid-cols-3 sm:p-5">
        {steps.map((step, index) => (
          <article className="rounded-lg border border-[#eadfcd] bg-white p-4" key={step.title}>
            <p className="text-xs font-semibold text-mint-600">STEP {index + 1}</p>
            <h2 className="mt-3 text-base font-bold">{step.title}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/60">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
