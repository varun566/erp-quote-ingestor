import { useEffect, useState } from "react";
import Link from "next/link";

type Rfq = { id: string; title: string; createdAt: string };

export default function RfqsPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const [title, setTitle] = useState("RFQ-001: Bearings + Rotor Parts");
  const [created, setCreated] = useState<Rfq | null>(null);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [err, setErr] = useState<string>("");

  async function refresh() {
    setErr("");
    try {
      const r = await fetch(`${api}/rfqs`);
      const data = await r.json();
      setRfqs(data);
    } catch (e: any) {
      setErr(e?.message || "failed to load rfqs");
    }
  }

  useEffect(() => { if (api) refresh(); }, [api]);

  async function createRfq() {
    setErr("");
    setCreated(null);
    try {
      const r = await fetch(`${api}/rfqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "create_failed");
      setCreated(data);
      refresh();
    } catch (e: any) {
      setErr(e?.message || "create_failed");
    }
  }

  return (
    <div className="container">
      <div className="row">
        <Link href="/">← Home</Link>
        <Link href="/imports">Import CSV →</Link>
      </div>

      <h2>Create RFQ</h2>

      <div className="card">
        <div className="row">
          <input style={{ minWidth: 360 }} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button onClick={createRfq}>Create</button>
        </div>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {created && (
          <div>
            <p><b>Created RFQ</b></p>
            <pre>{JSON.stringify(created, null, 2)}</pre>
          </div>
        )}
      </div>

      <h3>Recent RFQs</h3>
      {rfqs.map(r => (
        <div key={r.id} className="card">
          <div><b>{r.title}</b></div>
          <small>ID: {r.id}</small>
        </div>
      ))}
    </div>
  );
}
