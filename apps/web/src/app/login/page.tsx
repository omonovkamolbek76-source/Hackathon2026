"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setTokens } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("tadbirkor@businessos.uz");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const tokens = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <Link href="/" className="mb-8 text-sm text-mist">
        ← BusinessOS AI
      </Link>
      <h1 className="text-3xl font-semibold">Kirish</h1>
      <form onSubmit={onSubmit} className="glass mt-6 space-y-4 rounded-3xl p-6">
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
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className="w-full rounded-2xl bg-mint py-3 font-semibold text-ink">Davom etish</button>
      </form>
    </main>
  );
}
