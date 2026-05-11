import { Dispatch, SetStateAction } from "react";
import { skins } from "@/lib/constants";
import { buySkin } from "@/lib/gameLogic";
import type { AppData } from "@/types";

type RewardShopProps = {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
};

export default function RewardShop({ data, setData }: RewardShopProps) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Reward Shop</h2>
          <p className="mt-1 text-sm font-bold text-ink/55">使用 coins 解鎖造型。</p>
        </div>
        <span className="rounded-lg bg-honey/20 px-3 py-2 text-sm font-black">🪙 {data.userState.coins}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
        {skins.map((skin) => {
          const unlocked = data.userState.unlockedSkinIds.includes(skin.id);
          const selected = data.userState.selectedSkinId === skin.id;
          const canBuy = data.userState.coins >= skin.price;

          return (
            <article className="rounded-lg bg-white p-3 shadow-card sm:p-4" key={skin.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint-50 text-2xl sm:h-12 sm:w-12 sm:text-3xl">{skin.emoji}</div>
                  <div className="min-w-0">
                    <h3 className="truncate font-black">{skin.name}</h3>
                    <p className="text-sm font-bold text-ink/50">{skin.price === 0 ? "免費" : `${skin.price} coins`}</p>
                  </div>
                </div>
                <button
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-black shadow-card transition focus-ring ${
                    selected
                      ? "bg-ink text-white"
                      : unlocked || canBuy
                        ? "bg-mint-600 text-white hover:bg-mint-500"
                        : "bg-slate-100 text-ink/38"
                  }`}
                  disabled={!unlocked && !canBuy}
                  onClick={() => setData((current) => buySkin(current, skin.id))}
                  type="button"
                >
                  {selected ? "使用中" : unlocked ? "套用" : "解鎖"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
