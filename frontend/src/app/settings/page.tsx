"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PixelIcon from "@/components/PixelIcon";
import PetCanvas from "@/components/PetCanvas";
import {
  getAuthState,
  getMyProfile,
  updateProfile,
  changePassword,
  listFriends,
  listPendingFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  signOut,
} from "@/lib/nekoRepository";

// Supported avatars
const AVATAR_OPTIONS = [
  { id: "cat_orange", label: "橘貓" },
  { id: "cat_gray", label: "灰貓" },
  { id: "cat_lavender", label: "紫貓" },
  { id: "dog_brown", label: "柴犬" },
  { id: "dog_gray", label: "灰狗" },
  { id: "dog_blue", label: "藍狗" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "friends" | "password">("profile");

  // Profile States
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Friends States
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [friendError, setFriendError] = useState("");

  // Global Loading
  const [loading, setLoading] = useState(true);

  // Load Data
  const loadAllData = async () => {
    try {
      setLoading(true);

      // 先確認登入狀態，未登入直接跳轉，避免對需要 Bearer token 的 API
      // 發出請求（FastAPI HTTPBearer 在無 token 時回 403 而非 401）
      const auth = await getAuthState();
      if (!auth.userId) {
        router.replace("/login");
        return;
      }

      const userProfile = await getMyProfile();
      setProfile(userProfile);
      setUsername(userProfile.username || "");
      setAvatar(userProfile.avatar || "cat_orange");
      setBio(userProfile.bio || "");

      const friendsList = await listFriends();
      setFriends(friendsList);

      const pendingList = await listPendingFriendRequests();
      setPendingRequests(pendingList);
    } catch (err: any) {
      console.error(err);
      // 其他授權錯誤也導向登入頁
      if (
        err.message.includes("401") ||
        err.message.includes("403") ||
        err.message.includes("credentials") ||
        err.message.includes("token")
      ) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage("");
    setProfileError("");
    try {
      const updated = await updateProfile({ username, avatar, bio });
      setProfile(updated);
      setProfileMessage("個人資料更新成功！");
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage("");
    setPwdError("");

    if (newPassword !== confirmPassword) {
      setPwdError("新密碼與確認密碼不一致！");
      return;
    }

    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setPwdMessage("密碼變更成功！");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.message);
    }
  };

  // Handle Add Friend
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendMessage("");
    setFriendError("");

    if (!/^NEKO-[A-Z0-9]{4}$/.test(searchCode.trim().toUpperCase())) {
      setFriendError("好友碼格式不正確！應為 NEKO-XXXX");
      return;
    }

    try {
      await sendFriendRequest(searchCode.trim().toUpperCase());
      setFriendMessage("好友邀請已送出！");
      setSearchCode("");
      // Reload lists
      const pendingList = await listPendingFriendRequests();
      setPendingRequests(pendingList);
    } catch (err: any) {
      setFriendError(err.message);
    }
  };

  // Handle Accept/Decline Request
  const handleRespondRequest = async (requestId: string, action: "accept" | "decline") => {
    setFriendMessage("");
    setFriendError("");
    try {
      await respondFriendRequest(requestId, action);
      setFriendMessage(action === "accept" ? "已接受好友邀請！" : "已拒絕好友邀請。");
      // Reload both lists
      const friendsList = await listFriends();
      setFriends(friendsList);
      const pendingList = await listPendingFriendRequests();
      setPendingRequests(pendingList);
    } catch (err: any) {
      setFriendError(err.message);
    }
  };

  // Handle Remove Friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("確定要刪除此好友嗎？")) return;
    setFriendMessage("");
    setFriendError("");
    try {
      await removeFriend(friendId);
      setFriendMessage("好友已刪除。");
      // Reload lists
      const friendsList = await listFriends();
      setFriends(friendsList);
    } catch (err: any) {
      setFriendError(err.message);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (!confirm("確定要登出嗎？")) return;
    await signOut();
    router.replace("/login");
  };

  const copyFriendCode = () => {
    if (!profile?.friend_code) return;
    navigator.clipboard.writeText(profile.friend_code);
    alert("好友碼已複製至剪貼簿！");
  };

  if (loading && !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FDF8F0] text-sm font-black text-[#3D2B1F]">
        載入中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">個人設置</h1>
            <p className="text-sm font-bold text-[#8B6F5E]">編輯資料與管理好友</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border-4 border-[#3D2B1F] bg-[#E24B4A] px-3 py-2 text-sm font-black text-white shadow-[3px_3px_0_#3D2B1F] hover:translate-y-0.5 active:translate-y-1"
          >
            登出
          </button>
        </header>

        {/* Tab Buttons */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          {(["profile", "friends", "password"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md border-4 border-[#3D2B1F] py-2 text-sm font-black shadow-[3px_3px_0_#3D2B1F] transition ${
                activeTab === tab
                  ? "bg-[#E8734A] text-white"
                  : "bg-[#F5E6C8] text-[#3D2B1F]"
              }`}
            >
              {tab === "profile" && "編輯資料"}
              {tab === "friends" && `好友系統 (${friends.length})`}
              {tab === "password" && "修改密碼"}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <section className="space-y-4 rounded-md border-4 border-[#3D2B1F] bg-white p-5 shadow-[6px_6px_0_#3D2B1F]">
            <h2 className="text-lg font-black border-b-4 border-[#3D2B1F] pb-2">我的個人資料</h2>
            
            {/* Friend Code card */}
            <div className="rounded-md border-4 border-[#D4A96A] bg-[#F5E6C8] p-3 flex justify-between items-center">
              <div>
                <span className="block text-xs font-black text-[#8B6F5E]">我的好友碼</span>
                <span className="text-lg font-black tracking-wider text-[#3D2B1F]">
                  {profile?.friend_code || "產生中..."}
                </span>
              </div>
              <button
                onClick={copyFriendCode}
                className="rounded-md border-2 border-[#3D2B1F] bg-white px-2 py-1 text-xs font-black text-[#3D2B1F] active:translate-y-0.5"
              >
                複製
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#FDF8F0] border-4 border-[#3D2B1F] rounded-md gap-1">
                <div className="h-16 w-16 rounded-full border-4 border-[#3D2B1F] bg-[#FFE0DA] flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    (() => {
                      const [pType, pColor] = avatar.split("_");
                      return (
                        <PetCanvas
                          type={pType as any}
                          color={pColor as any}
                          animation="idle"
                          size={56}
                        />
                      );
                    })()
                  ) : (
                    <div className="h-full w-full bg-[#E8734A]" />
                  )}
                </div>
                <span className="text-[11px] font-black text-[#8B6F5E]">頭像預覽</span>
              </div>

              <div>
                <label className="block text-sm font-black mb-1">使用者名稱</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={24}
                  required
                  className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-sm font-black outline-none focus:border-[#E8734A]"
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2">選擇頭像</label>
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_OPTIONS.map((opt) => {
                    const [pType, pColor] = opt.id.split("_");
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAvatar(opt.id)}
                        className={`rounded-md border-4 p-2 text-xs font-black text-center flex flex-col items-center justify-center gap-1 transition ${
                          avatar === opt.id
                            ? "border-[#E8734A] bg-[#FFE0DA] text-[#E8734A]"
                            : "border-[#3D2B1F] bg-[#FDF8F0] text-[#3D2B1F]"
                        }`}
                      >
                        <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
                          <PetCanvas
                            type={pType as any}
                            color={pColor as any}
                            animation={avatar === opt.id ? "happy" : "idle"}
                            size={40}
                          />
                        </div>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-black mb-1">個人簡介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="寫點關於你或你的寵物吧..."
                  className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-sm font-black outline-none focus:border-[#E8734A] resize-none"
                />
              </div>

              {profileMessage && (
                <p className="text-xs font-black text-[#5DCAA5]">{profileMessage}</p>
              )}
              {profileError && (
                <p className="text-xs font-black text-[#E24B4A]">{profileError}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#E8734A] py-3 font-black text-white shadow-[4px_4px_0_#3D2B1F] hover:translate-y-0.5 active:translate-y-1"
              >
                儲存設定
              </button>
            </form>
          </section>
        )}

        {/* PASSWORD TAB */}
        {activeTab === "password" && (
          <section className="space-y-4 rounded-md border-4 border-[#3D2B1F] bg-white p-5 shadow-[6px_6px_0_#3D2B1F]">
            <h2 className="text-lg font-black border-b-4 border-[#3D2B1F] pb-2">變更密碼</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-black mb-1">當前密碼</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-sm font-black outline-none focus:border-[#E8734A]"
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-1">新密碼 (最少 8 碼，包含字母及數字)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-sm font-black outline-none focus:border-[#E8734A]"
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-1">確認新密碼</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-sm font-black outline-none focus:border-[#E8734A]"
                />
              </div>

              {pwdMessage && (
                <p className="text-xs font-black text-[#5DCAA5]">{pwdMessage}</p>
              )}
              {pwdError && (
                <p className="text-xs font-black text-[#E24B4A]">{pwdError}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-md border-4 border-[#3D2B1F] bg-[#E8734A] py-3 font-black text-white shadow-[4px_4px_0_#3D2B1F] hover:translate-y-0.5 active:translate-y-1"
              >
                修改密碼
              </button>
            </form>
          </section>
        )}

        {/* FRIENDS TAB */}
        {activeTab === "friends" && (
          <div className="space-y-6">
            {/* Add Friend Form */}
            <section className="space-y-4 rounded-md border-4 border-[#3D2B1F] bg-white p-5 shadow-[6px_6px_0_#3D2B1F]">
              <h2 className="text-lg font-black border-b-4 border-[#3D2B1F] pb-2">新增好友</h2>
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <input
                  type="text"
                  placeholder="好友碼 (例如: NEKO-XXXX)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  required
                  className="flex-1 rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-3 py-2 text-sm font-black outline-none focus:border-[#E8734A]"
                />
                <button
                  type="submit"
                  className="rounded-md border-4 border-[#3D2B1F] bg-[#E8734A] px-4 font-black text-white shadow-[3px_3px_0_#3D2B1F] active:translate-y-0.5"
                >
                  送出
                </button>
              </form>
              {friendMessage && (
                <p className="text-xs font-black text-[#5DCAA5]">{friendMessage}</p>
              )}
              {friendError && (
                <p className="text-xs font-black text-[#E24B4A]">{friendError}</p>
              )}
            </section>

            {/* Pending Friend Requests */}
            {pendingRequests.length > 0 && (
              <section className="space-y-4 rounded-md border-4 border-[#3D2B1F] bg-[#FFE0DA] p-5 shadow-[6px_6px_0_#3D2B1F]">
                <h2 className="text-lg font-black border-b-4 border-[#3D2B1F] pb-2 text-[#E24B4A]">
                  待處理的好友申請
                </h2>
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-md border-2 border-[#3D2B1F] bg-white p-3 flex justify-between items-center"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        {/* Avatar representation */}
                        <div className="h-10 w-10 rounded-full border-2 border-[#3D2B1F] bg-[#FDF8F0] flex items-center justify-center shrink-0 overflow-hidden">
                          {req.user.avatar ? (
                            (() => {
                              const [pType, pColor] = req.user.avatar.split("_");
                              return (
                                <PetCanvas
                                  type={pType as any}
                                  color={pColor as any}
                                  animation="idle"
                                  size={32}
                                />
                              );
                            })()
                          ) : (
                            <span className="font-black text-xs">
                              {req.user.username.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-black text-sm block">{req.user.username}</span>
                          {req.user.bio && (
                            <span className="text-xs text-[#8B6F5E] block truncate">{req.user.bio}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespondRequest(req.id, "accept")}
                          className="rounded border-2 border-[#3D2B1F] bg-[#5DCAA5] px-2 py-1 text-xs font-black text-white active:translate-y-0.5"
                        >
                          接受
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, "decline")}
                          className="rounded border-2 border-[#3D2B1F] bg-[#E24B4A] px-2 py-1 text-xs font-black text-white active:translate-y-0.5"
                        >
                          拒絕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Friend List */}
            <section className="space-y-4 rounded-md border-4 border-[#3D2B1F] bg-white p-5 shadow-[6px_6px_0_#3D2B1F]">
              <h2 className="text-lg font-black border-b-4 border-[#3D2B1F] pb-2">好友列表 ({friends.length})</h2>
              {friends.length === 0 ? (
                <p className="text-sm font-bold text-center text-[#8B6F5E] py-4">目前還沒有好友喔！快分享你的好友碼吧。</p>
              ) : (
                <div className="space-y-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] p-3 flex justify-between items-center shadow-[3px_3px_0_#3D2B1F]"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        {/* Avatar representation */}
                        <div className="h-10 w-10 rounded-full border-2 border-[#3D2B1F] bg-[#FDF8F0] flex items-center justify-center shrink-0 overflow-hidden">
                          {friend.user.avatar ? (
                            (() => {
                              const [pType, pColor] = friend.user.avatar.split("_");
                              return (
                                <PetCanvas
                                  type={pType as any}
                                  color={pColor as any}
                                  animation="idle"
                                  size={32}
                                />
                              );
                            })()
                          ) : (
                            <span className="font-black text-xs">
                              {friend.user.username.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-black text-sm block">{friend.user.username}</span>
                          {friend.user.pet ? (
                            <span className="text-xs font-bold text-[#8B6F5E] block truncate">
                              🐾 {friend.user.pet.name} ({friend.user.pet.type === "cat" ? "貓咪" : "狗狗"})
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-[#8B6F5E] block">
                              🚫 還沒有寵物
                            </span>
                          )}
                          {friend.user.bio && (
                            <span className="text-[11px] text-[#8B6F5E] block truncate">{friend.user.bio}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.user.id)}
                        className="rounded-md border-2 border-[#3D2B1F] bg-white px-2 py-1 text-xs font-black text-[#E24B4A] hover:bg-[#FFE0DA] shrink-0 active:translate-y-0.5"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
