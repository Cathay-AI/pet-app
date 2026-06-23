"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthState, signInWithEmailAndPassword, signUpWithEmailAndPassword } from "@/lib/nekoRepository";

export default function LoginPage() {
  const router = useRouter();
  
  // Tab states: "login" or "register"
  const [tab, setTab] = useState<"login" | "register">("login");
  
  // Input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getAuthState().then((auth) => {
      if (auth.userId) {
        router.replace("/");
      }
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    if (tab === "register") {
      if (!username.trim()) return;
      if (password !== confirmPassword) {
        setStatus("error");
        setMessage("兩次輸入的密碼不一致。");
        return;
      }
    }

    setStatus("submitting");
    setMessage("");

    if (tab === "register") {
      const result = await signUpWithEmailAndPassword(email.trim(), username.trim(), password);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage("註冊成功，正在跳轉...");
      router.replace("/");
    } else {
      const result = await signInWithEmailAndPassword(email.trim(), password);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage("登入成功，正在跳轉...");
      router.replace("/");
    }
  }

  return (
    <main className="min-h-screen bg-[#090912] px-5 py-8 text-[#FDF8F0]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <section className="rounded-md border-4 border-[#FDF8F0] bg-[#121225] p-5 shadow-[8px_8px_0_#E8734A]">
          <p className="text-sm font-black text-[#D4A96A]">雲端照顧模式</p>
          
          {/* Tabs header */}
          <div className="mt-4 flex border-b-4 border-[#3D2B1F]">
            <button
              onClick={() => {
                setTab("login");
                setMessage("");
                setStatus("idle");
              }}
              className={`flex-1 py-2 text-center font-black ${
                tab === "login" ? "bg-[#E8734A] text-white" : "bg-transparent text-[#F5E6C8] hover:bg-[#1A1A2E]"
              }`}
            >
              登入
            </button>
            <button
              onClick={() => {
                setTab("register");
                setMessage("");
                setStatus("idle");
              }}
              className={`flex-1 py-2 text-center font-black ${
                tab === "register" ? "bg-[#E8734A] text-white" : "bg-transparent text-[#F5E6C8] hover:bg-[#1A1A2E]"
              }`}
            >
              註冊
            </button>
          </div>

          <h1 className="mt-5 text-3xl font-black">{tab === "login" ? "登入 Neko" : "註冊新帳號"}</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#F5E6C8]">
            {tab === "login"
              ? "登入後，寵物狀態會同步至伺服器資料庫，公開健康分會出現在排行榜。"
              : "註冊專屬帳號以記錄寵物的狀態，開啟與 Neko 互動的像素世界。"}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {tab === "register" && (
              <label className="block text-sm font-black">
                飼主名稱 (Username)
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  type="text"
                  placeholder="例如: 小明"
                  maxLength={12}
                  className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
                  required
                />
              </label>
            )}

            <label className="block text-sm font-black">
              電子信箱 (Email)
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
                required
              />
            </label>

            <label className="block text-sm font-black">
              密碼 (Password)
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="至少 8 個字元，須包含英文和數字"
                className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
                required
              />
            </label>

            {tab === "login" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-black text-[#D4A96A] hover:underline"
                >
                  忘記密碼？
                </Link>
              </div>
            )}

            {tab === "register" && (
              <label className="block text-sm font-black">
                確認密碼 (Confirm Password)
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="請再次輸入密碼"
                  className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
                  required
                />
              </label>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-md border-4 border-[#FDF8F0] bg-[#E8734A] px-5 py-4 text-lg font-black text-white shadow-[4px_4px_0_#3D2B1F] disabled:opacity-60"
            >
              {status === "submitting" ? "處理中..." : tab === "login" ? "登入" : "註冊"}
            </button>
          </form>

          {message ? (
            <p
              className={`mt-4 rounded border-2 p-3 text-sm font-black ${
                status === "error"
                  ? "border-[#E24B4A] bg-[#2A1418] text-[#E24B4A]"
                  : "border-[#4AE273] bg-[#142A1D] text-[#4AE273]"
              }`}
            >
              {message}
            </p>
          ) : null}

        </section>
      </div>
    </main>
  );
}
