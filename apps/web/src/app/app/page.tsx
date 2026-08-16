"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, clearTokens, getToken } from "../../lib/api";
import { LANGS, readLang, tx, writeLang } from "../../lib/i18n";
import type { Language } from "@businessos/shared";

type Card = Record<string, unknown> & { type: string };
type ChatResponse = {
  conversationId: string;
  message: string;
  language: Language;
  intent: string;
  cards: Card[];
  decision: {
    id: string;
    confidence: number;
    evidence: Array<{ label: string; detail: string; source?: string; updatedAt?: string }>;
    why: Array<{ title: string; detail: string }>;
    approval: string;
  };
};

type Msg = { role: "user" | "assistant"; content: string; cards?: Card[]; decision?: ChatResponse["decision"] };

export default function CommandCenter() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("uz");
  const [me, setMe] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [whyOpen, setWhyOpen] = useState<ChatResponse["decision"] | null>(null);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(readLang());
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api("/auth/me")
      .then(setMe)
      .catch(() => {
        clearTokens();
        router.replace("/login");
      });
    api("/businesses/me/briefing").then(setBriefing).catch(() => null);
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const name = me?.fullName?.split(" ")[0] ?? "Tadbirkor";
  const health = briefing?.health?.score ?? me?.businesses?.[0]?.healthScores?.[0]?.score ?? 82;

  async function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setBusy(true);
    try {
      const res = await api<ChatResponse>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      setConversationId(res.conversationId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.message, cards: res.cards, decision: res.decision },
      ]);
      speak(res.message, res.language);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: err instanceof Error ? err.message : tx("aiDown", lang) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function voice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setInput((v) => v || "Menga sementning bugungi narxlarini topib ber.");
      return;
    }
    const rec = new SR();
    rec.lang = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
    rec.onresult = (e: any) => send(e.results[0][0].transcript);
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.start();
  }

  const suggestions = useMemo(
    () => [
      "Men 200 mln so‘mlik mahsulot olib kelib sotmoqchiman. Qaysi mahsulotni olish foydaliroq?",
      "Menga kredit kerak, 150 mln, 12 oy.",
      "Qarshida sement narxini solishtir.",
    ],
    [],
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 md:px-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-mist">BusinessOS AI</p>
          <h1 className="text-2xl font-semibold">
            {tx("greeting", lang)}, {name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => {
                writeLang(l);
                setLang(l);
              }}
              className={`rounded-full px-2.5 py-1 text-xs uppercase ${lang === l ? "bg-white/10" : "text-mist"}`}
            >
              {l}
            </button>
          ))}
          {me?.role === "ADMIN" ? (
            <Link href="/app/admin" className="rounded-full border border-line px-3 py-1 text-xs text-mist">
              Admin
            </Link>
          ) : null}
          <button
            onClick={() => {
              clearTokens();
              router.push("/");
            }}
            className="text-xs text-mist"
          >
            Chiqish
          </button>
        </div>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-widest text-mist">{tx("health", lang)}</p>
          <p className="mt-2 text-5xl font-semibold text-mint">{health}</p>
          <p className="text-mist">/100 · {briefing?.health?.status ?? "HEALTHY"}</p>
        </article>
        <article className="glass rounded-3xl p-5 md:col-span-2">
          <p className="text-xs uppercase tracking-widest text-mist">{tx("signals", lang)}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {(briefing?.notifications ?? []).slice(0, 3).map((n: any) => (
              <li key={n.id} className="text-mist">
                <span className="text-gold">●</span> {n.body}
              </li>
            ))}
            {!briefing?.notifications?.length ? (
              <li className="text-mist">AI signallar profilingiz va bozor adapteridan keladi.</li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="mt-6">
        <div className="cmd-input glass flex items-end gap-2 rounded-3xl p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={tx("ask", lang)}
            className="min-h-[64px] w-full resize-none bg-transparent px-3 py-2 outline-none"
          />
          <button
            onClick={voice}
            className={`rounded-2xl px-3 py-3 ${listening ? "bg-gold text-ink" : "bg-white/5 text-mist"}`}
            aria-label="voice"
          >
            🎤
          </button>
          <button onClick={() => send()} className="rounded-2xl bg-mint px-4 py-3 font-semibold text-ink">
            Yuborish
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line px-3 py-1 text-left text-xs text-mist"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-4 pb-16">
        {messages.map((m, i) => (
          <article key={i} className={m.role === "user" ? "ml-auto max-w-2xl" : "max-w-3xl"}>
            <div
              className={`rounded-3xl px-5 py-4 ${
                m.role === "user" ? "bg-white/10" : "glass"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.decision ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-mist">
                  <span>Confidence {Math.round(m.decision.confidence * 100)}%</span>
                  <button onClick={() => setWhyOpen(m.decision!)} className="rounded-full bg-gold/15 px-3 py-1 text-gold">
                    {tx("why", lang)}
                  </button>
                  {m.decision.id ? (
                    <>
                      <button
                        onClick={() =>
                          api("/ai/feedback", {
                            method: "POST",
                            body: JSON.stringify({ decisionId: m.decision!.id, helpful: true }),
                          })
                        }
                      >
                        👍
                      </button>
                      <button
                        onClick={() =>
                          api("/ai/feedback", {
                            method: "POST",
                            body: JSON.stringify({ decisionId: m.decision!.id, helpful: false }),
                          })
                        }
                      >
                        👎
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            {m.cards?.map((card, idx) => (
              <CardView key={idx} card={card} />
            ))}
          </article>
        ))}
        {busy ? <p className="text-sm text-mint">THINK → ANALYZE → CALL TOOLS…</p> : null}
        <div ref={endRef} />
      </section>

      {whyOpen ? (
        <div className="fixed inset-0 z-20 grid place-items-end bg-black/50 p-4 md:place-items-center">
          <div className="glass w-full max-w-lg rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Why did AI recommend this?</h2>
              <button onClick={() => setWhyOpen(null)} className="text-mist">
                Close
              </button>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {whyOpen.why.map((w, i) => (
                <li key={i}>
                  <span className="text-mint">{w.title}:</span> {w.detail}
                </li>
              ))}
              {whyOpen.evidence.map((e, i) => (
                <li key={`e-${i}`} className="text-mist">
                  {e.label} — {e.detail}
                  {e.source ? ` · ${e.source}` : ""}
                  {e.updatedAt ? ` · ${new Date(e.updatedAt).toLocaleString()}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function speak(text: string, language: Language) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function CardView({ card }: { card: Card }) {
  if (card.type === "opportunities") {
    const items = card.items as Array<any>;
    return (
      <div className="mt-3 overflow-x-auto rounded-3xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-mist">
            <tr>
              <th className="px-4 py-3">Mahsulot</th>
              <th>Talab</th>
              <th>Marja</th>
              <th>Risk</th>
              <th>Tavsiya</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.product} className="border-t border-line">
                <td className="px-4 py-3">{item.label}</td>
                <td>{item.demandScore}</td>
                <td>{item.estimatedMarginPct}%</td>
                <td>{item.risk}</td>
                <td>{item.recommended ? "✓ AI tanlovi" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (card.type === "compare") {
    const offers = (card.offers as Array<any>) ?? [];
    return (
      <div className="mt-3 overflow-x-auto rounded-3xl border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/5 text-mist">
            <tr>
              <th className="px-4 py-3">Yetkazib beruvchi</th>
              <th>Narx</th>
              <th>Yakuniy</th>
              <th>Sifat</th>
              <th>Ishonch</th>
              <th>Match</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.supplierId} className="border-t border-line">
                <td className="px-4 py-3">{o.supplierName}</td>
                <td>{o.unitPriceSom?.toLocaleString()}</td>
                <td>{o.totalCostSom?.toLocaleString()}</td>
                <td>{o.quality}</td>
                <td>{o.reliability}</td>
                <td>{o.matchScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (card.type === "health") {
    return (
      <div className="glass mt-3 rounded-3xl p-4">
        <p className="text-3xl font-semibold text-mint">{String(card.score)}</p>
        <p className="text-mist">{String(card.summary)}</p>
      </div>
    );
  }
  if (card.type === "credit") {
    return (
      <div className="glass mt-3 rounded-3xl p-4 text-sm">
        <p>Oylik to‘lov: {(card.monthlyPaymentSom as number)?.toLocaleString()} so‘m</p>
        <p>Readiness: {(card.readiness as any)?.score ?? "—"} / 100</p>
      </div>
    );
  }
  if (card.type === "plan") {
    const sections = (card.sections as Array<{ title: string; body: string }>) ?? [];
    return (
      <div className="glass mt-3 space-y-2 rounded-3xl p-4 text-sm">
        {sections.map((s) => (
          <div key={s.title}>
            <p className="text-gold">{s.title}</p>
            <p className="text-mist">{s.body}</p>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === "demand") {
    const items = (card.items as Array<any>) ?? [];
    return (
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {items.map((d) => (
          <div key={d.product} className="rounded-2xl border border-line p-3 text-sm">
            {d.label}: {d.score} ({d.changePct}%)
          </div>
        ))}
      </div>
    );
  }
  return null;
}
