"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthState, signInWithEmail } from "@/lib/nekoRepository";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "local" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getAuthState().then((auth) => {
      if (!auth.isConfigured) {
        setStatus("local");
        setMessage("目前尚未設定 Supabase，Neko 會先使用本機模式。");
      } else if (auth.userId) {
        router.replace("/home");
      }
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    const result = await signInWithEmail(email.trim());
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("sent");
    setMessage("登入連結已寄出，請到信箱點擊後回到 Neko。");
  }

  return (
    <main className="min-h-screen bg-[#090912] px-5 py-8 text-[#FDF8F0]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <section className="rounded-md border-4 border-[#FDF8F0] bg-[#121225] p-5 shadow-[8px_8px_0_#E8734A]">
          <p className="text-sm font-black text-[#D4A96A]">雲端照顧模式</p>
          <h1 className="mt-1 text-3xl font-black">登入 Neko</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#F5E6C8]">
            登入後，寵物狀態會同步到資料庫，公開健康分會出現在排行榜。
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-black">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
              />
            </label>
            <button
              type="submit"
              disabled={status === "sending" || status === "local"}
              className="w-full rounded-md border-4 border-[#FDF8F0] bg-[#E8734A] px-5 py-4 text-lg font-black text-white shadow-[4px_4px_0_#3D2B1F] disabled:opacity-60"
            >
              {status === "sending" ? "寄送中..." : "寄登入連結"}
            </button>
          </form>

          {message ? (
            <p className={`mt-4 rounded border-2 p-3 text-sm font-black ${status === "error" ? "border-[#E24B4A] text-[#E24B4A]" : "border-[#D4A96A]"}`}>
              {message}
            </p>
          ) : null}

          <Link href="/home" className="mt-5 inline-block text-sm font-black text-[#F5E6C8] underline">
            回到目前的寵物
          </Link>
        </section>
      </div>
    </main>
  );
}
