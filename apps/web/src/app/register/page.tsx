"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setTokens } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const tokens = await api<{ accessToken: string; refreshToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password, language: "uz" }),
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <Link href="/" className="mb-8 text-sm text-mist">
        ← BusinessOS AI
      </Link>
      <h1 className="text-3xl font-semibold">Ro‘yxatdan o‘tish</h1>
      <p className="mt-2 text-mist">Keyin AI so‘raydi: biznesingiz haqida 30 soniya gapirib bering.</p>
      <form onSubmit={onSubmit} className="glass mt-6 space-y-4 rounded-3xl p-6">
        <input
          className="w-full rounded-2xl border border-line bg-black/30 px-4 py-3 outline-none"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ism"
        />
        <input
          className="w-full rounded-2xl border border-line bg-black/30 px-4 py-3 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
        />
        <input
          type="password"
          className="w-full rounded-2xl border border-line bg-black/30 px-4 py-3 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="kamida 8 belgi"
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className="w-full rounded-2xl bg-mint py-3 font-semibold text-ink">Boshlash</button>
      </form>
    </main>
  );
}
