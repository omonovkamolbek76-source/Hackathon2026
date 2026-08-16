"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/admin/overview"), api("/admin/decisions"), api("/admin/users")])
      .then(([overview, decisions, users]) => setData({ overview, decisions, users }))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link href="/app" className="text-sm text-mist">
        ← Command Center
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Admin</h1>
      {error ? <p className="mt-4 text-red-300">{error}</p> : null}
      {data ? (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Object.entries(data.overview).map(([k, v]) => (
            <div key={k} className="glass rounded-3xl p-4">
              <p className="text-xs uppercase text-mist">{k}</p>
              <p className="mt-2 text-2xl">{String(v)}</p>
            </div>
          ))}
        </div>
      ) : null}
      <section className="mt-8">
        <h2 className="text-lg">AI decisions</h2>
        <div className="mt-3 overflow-x-auto rounded-3xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-mist">
              <tr>
                <th className="px-3 py-2">Agent</th>
                <th>Task</th>
                <th>Conf</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {(data?.decisions ?? []).map((d: any) => (
                <tr key={d.id} className="border-t border-line">
                  <td className="px-3 py-2">{d.agentName}</td>
                  <td>{d.taskType}</td>
                  <td>{Math.round(d.confidence * 100)}%</td>
                  <td>{d.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
