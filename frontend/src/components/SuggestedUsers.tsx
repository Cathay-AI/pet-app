import { useState } from "react";
import PetCanvas from "@/components/PetCanvas";
import type { SuggestedUser } from "@/types";

type SuggestedUsersProps = {
  suggestions: SuggestedUser[];
  isLoading?: boolean;
  onAddFriend: (friendCode: string) => Promise<void>;
};

export default function SuggestedUsers({ suggestions, isLoading, onAddFriend }: SuggestedUsersProps) {
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleAddFriend = async (suggestion: SuggestedUser) => {
    if (adding.has(suggestion.id) || added.has(suggestion.id)) return;

    setAdding((prev) => new Set(prev).add(suggestion.id));

    try {
      await onAddFriend(suggestion.friendCode);
      setAdded((prev) => new Set(prev).add(suggestion.id));
    } catch (error) {
      console.error("Failed to add friend:", error);
      alert(error instanceof Error ? error.message : "加好友失敗");
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border-4 border-[#D4A96A] bg-[#FDF8F0] p-6 text-center shadow-[4px_4px_0_#D4A96A]">
        <p className="text-sm font-black text-[#8B6F5E]">載入推薦用戶中...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show section if no suggestions
  }

  return (
    <section className="rounded-md border-4 border-[#D4A96A] bg-[#FDF8F0] shadow-[4px_4px_0_#D4A96A]">
      <div className="border-b-4 border-[#D4A96A] bg-[#F5E6C8] px-4 py-3">
        <h2 className="text-lg font-black">推薦好友</h2>
        <p className="text-xs text-[#8B6F5E]">可能認識的 Neko 飼主</p>
      </div>

      <div className="p-3">
        <div className="space-y-2">
          {suggestions.map((suggestion) => {
            const isAdding = adding.has(suggestion.id);
            const isAdded = added.has(suggestion.id);

            return (
              <div
                key={suggestion.id}
                className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-md border-2 border-[#D4A96A] bg-white p-2"
              >
                {/* Pet Avatar */}
                <div className="grid h-14 w-14 place-items-center rounded bg-[#1A1A2E]">
                  <PetCanvas
                    type={suggestion.petType}
                    color={suggestion.petColor}
                    animation="idle"
                    hunger={80}
                    cleanliness={80}
                    size={52}
                  />
                </div>

                {/* User Info */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{suggestion.username}</p>
                  <p className="truncate text-xs text-[#8B6F5E]">
                    {suggestion.petName} · {suggestion.petType === "cat" ? "貓" : "狗"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-[#E8734A] px-1.5 py-0.5 text-[10px] font-black text-white">
                      {suggestion.healthScore} 分
                    </span>
                    {suggestion.mutualFriends > 0 ? (
                      <span className="text-[10px] text-[#8B6F5E]">{suggestion.mutualFriends} 位共同好友</span>
                    ) : null}
                  </div>
                </div>

                {/* Add Friend Button */}
                <button
                  type="button"
                  onClick={() => handleAddFriend(suggestion)}
                  disabled={isAdding || isAdded}
                  className={`rounded-md border-2 px-3 py-2 text-xs font-black transition ${
                    isAdded
                      ? "border-[#4CAF50] bg-[#E8F5E9] text-[#4CAF50]"
                      : "border-[#3D2B1F] bg-[#E8734A] text-white hover:bg-[#D66639] disabled:opacity-50"
                  }`}
                >
                  {isAdding ? "..." : isAdded ? "已送出" : "加好友"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-xs text-[#8B6F5E]">根據活躍度和寵物健康推薦</p>
      </div>
    </section>
  );
}
