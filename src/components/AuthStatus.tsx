"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, type AuthState } from "@/lib/nekoRepository";

type AuthStatusProps = {
  auth: AuthState | null;
  mode?: "dark" | "light";
};

export default function AuthStatus({ auth, mode = "light" }: AuthStatusProps) {
  const router = useRouter();
  const isDark = mode === "dark";

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.replace("/login");
  }

  if (!auth?.isConfigured) {
    return (
      <span
        className={`rounded border-2 px-2 py-1 text-xs font-black ${
          isDark ? "border-[#FDF8F0] text-[#FDF8F0]" : "border-[#D4A96A] text-[#8B6F5E]"
        }`}
      >
        本機模式
      </span>
    );
  }

  if (!auth.userId) {
    return (
      <Link
        href="/login"
        className={`rounded border-2 px-3 py-2 text-xs font-black ${
          isDark ? "border-[#FDF8F0] bg-[#E8734A] text-white" : "border-[#3D2B1F] bg-[#F5E6C8] text-[#3D2B1F]"
        }`}
      >
        登入
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`rounded border-2 px-3 py-2 text-xs font-black ${
        isDark ? "border-[#FDF8F0] bg-[#121225] text-[#FDF8F0]" : "border-[#3D2B1F] bg-[#F5E6C8] text-[#3D2B1F]"
      }`}
    >
      登出
    </button>
  );
}
