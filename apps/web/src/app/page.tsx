"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANGS, readLang, tx, writeLang } from "../lib/i18n";
import type { Language } from "@businessos/shared";

export default function LandingPage() {
  const [lang, setLang] = useState<Language>("uz");
  useEffect(() => setLang(readLang()), []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint/15 text-mint">B</div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-mist">BusinessOS AI</p>
            <p className="text-lg font-semibold">{tx("tagline", lang)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => {
                writeLang(l);
                setLang(l);
              }}
              className={`rounded-full px-3 py-1 text-xs uppercase ${lang === l ? "bg-white/10 text-white" : "text-mist"}`}
            >
              {l}
            </button>
          ))}
          <Link href="/login" className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink">
            {tx("login", lang)}
          </Link>
        </div>
      </header>

      <section className="mt-20 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-mint">USER ASKS. AI DOES.</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-6xl">
            {tx("ask", lang)}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mist">
            {lang === "ru"
              ? "Не учитесь системе. Система понимает предпринимателя: рынок, поставщики, кредит, план — один запрос."
              : lang === "en"
                ? "Do not learn the system. The system understands the entrepreneur: market, suppliers, credit, plan — one request."
                : "Tizimni o‘rganmang. Tizim tadbirkorni tushunadi: bozor, supplier, kredit, reja — bitta so‘rov."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-white px-5 py-3 font-semibold text-ink">
              {tx("register", lang)}
            </Link>
            <Link href="/login" className="rounded-full border border-line px-5 py-3 text-mist">
              Demo: tadbirkor@businessos.uz
            </Link>
          </div>
        </div>
        <div className="glass shadow-glow rounded-3xl p-6">
          <p className="text-sm text-mist">AI Command Center</p>
          <div className="mt-4 rounded-2xl bg-black/30 p-4 text-sm leading-relaxed">
            “Men 200 mln so‘mlik mahsulot olib kelib sotmoqchiman. Qaysi mahsulotni olish foydaliroq?”
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-mint/20 bg-mint/5 p-4">
              <p className="text-mint">Tavsiya · flour</p>
              <p className="mt-1 text-mist">Talab 87 · Marja yuqori · Risk medium · Byudjetga mos</p>
            </div>
            <div className="rounded-2xl border border-line p-4 text-mist">
              WHY? Total cost + demand + capital fit. Evidence DB’dan.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
