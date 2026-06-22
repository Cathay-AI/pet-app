"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/nekoRepository";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Extract token from search params on mount
  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      setToken(t);
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) {
      setStatus("error");
      setMessage("重設 Token 缺失，請重新從郵件連結進入此頁面。");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage("密碼長度必須至少為 8 個字元。");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("兩次輸入的密碼不一致。");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const result = await resetPassword(token.trim(), password);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("密碼重設成功！3 秒後將為您跳轉至登入頁面...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  }

  return (
    <section className="rounded-md border-4 border-[#FDF8F0] bg-[#121225] p-5 shadow-[8px_8px_0_#E8734A]">
      <p className="text-sm font-black text-[#D4A96A]">雲端照顧模式</p>
      
      <h1 className="mt-5 text-3xl font-black">重設密碼</h1>
      <p className="mt-2 text-sm font-bold leading-6 text-[#F5E6C8]">
        請輸入您的新密碼。重設成功後，您需要以新密碼登入。
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {!searchParams.get("token") && (
          <label className="block text-sm font-black">
            重設 Token (Token)
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              type="text"
              placeholder="請貼上重設 Token"
              className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
              required
            />
          </label>
        )}

        <label className="block text-sm font-black">
          新密碼 (New Password)
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="至少 8 個字元，須包含英文和數字"
            className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
            required
          />
        </label>

        <label className="block text-sm font-black">
          確認新密碼 (Confirm Password)
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            placeholder="請再次輸入新密碼"
            className="mt-2 w-full rounded-md border-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-3 text-[#3D2B1F] outline-none focus:border-[#E8734A]"
            required
          />
        </label>

        <button
          type="submit"
          disabled={status === "submitting" || status === "success"}
          className="w-full rounded-md border-4 border-[#FDF8F0] bg-[#E8734A] px-5 py-4 text-lg font-black text-white shadow-[4px_4px_0_#3D2B1F] disabled:opacity-60"
        >
          {status === "submitting" ? "重設中..." : "重設密碼"}
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
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#090912] px-5 py-8 text-[#FDF8F0]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <Suspense fallback={
          <div className="rounded-md border-4 border-[#FDF8F0] bg-[#121225] p-5 text-center shadow-[8px_8px_0_#E8734A]">
            <p className="text-sm font-black text-white">載入中...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
