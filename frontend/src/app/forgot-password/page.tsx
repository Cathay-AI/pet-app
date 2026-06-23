"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/nekoRepository";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setMessage("");

    const result = await forgotPassword(email.trim());
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("重設密碼的連結已發送！開發環境中，請至後端伺服器的控制台 (Terminal) 查看連結網址並複製開啟。");
      setEmail("");
    }
  }

  return (
    <main className="min-h-screen bg-[#090912] px-5 py-8 text-[#FDF8F0]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <section className="rounded-md border-4 border-[#FDF8F0] bg-[#121225] p-5 shadow-[8px_8px_0_#E8734A]">
          <p className="text-sm font-black text-[#D4A96A]">雲端照顧模式</p>
          
          <h1 className="mt-5 text-3xl font-black">忘記密碼</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-[#F5E6C8]">
            請輸入您註冊的電子信箱，系統會為您產生專用的密碼重設連結。
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-md border-4 border-[#FDF8F0] bg-[#E8734A] px-5 py-4 text-lg font-black text-white shadow-[4px_4px_0_#3D2B1F] disabled:opacity-60"
            >
              {status === "submitting" ? "傳送中..." : "傳送重設連結"}
            </button>
          </form>

          {message ? (
            <p
              className={`mt-4 rounded border-2 p-3 text-sm font-black leading-6 ${
                status === "error"
                  ? "border-[#E24B4A] bg-[#2A1418] text-[#E24B4A]"
                  : "border-[#4AE273] bg-[#142A1D] text-[#4AE273]"
              }`}
            >
              {message}
            </p>
          ) : null}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-black text-[#F5E6C8] hover:underline"
            >
              ← 返回登入頁面
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
