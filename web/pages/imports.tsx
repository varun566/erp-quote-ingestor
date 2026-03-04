import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function ImportsPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const router = useRouter();

  const [rfqId, setRfqId] = useState("");
  const [supplierName, setSupplierName] = useState("Acme Defense Supply");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [resp, setResp] = useState<any>(null);

  async function submit() {
    setErr(""); setResp(null);
    if (!rfqId) return setErr("rfqId required");
    if (!supplierName) return setErr("supplierName required");
    if (!file) return setErr("CSV file required");

    try {
      const fd = new FormData();
      fd.append("rfqId", rfqId);
      fd.append("supplierName", supplierName);
      if (supplierEmail) fd.append("supplierEmail", supplierEmail);
      fd.append("file", file);

      const r = await fetch(`${api}/imports`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "import_failed");

      setResp(data);
      const jobId = data?.jobId || data?.job?.id;
      if (jobId) router.push(`/jobs/${jobId}`);
    } catch (e: any) {
      setErr(e?.message || "import_failed");
    }
  }

  return (
    <div className="container">
      <div className="row">
        <Link href="/">← Home</Link>
        <Link href="/rfqs">Create RFQ</Link>
      </div>

      <h2>Import Supplier CSV</h2>

      <div className="card">
        <div className="row">
          <input style={{ minWidth: 360 }} placeholder="RFQ ID" value={rfqId} onChange={(e) => setRfqId(e.target.value)} />
          <input style={{ minWidth: 240 }} placeholder="Supplier Name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </div>
        <div className="row">
          <input style={{ minWidth: 240 }} placeholder="Supplier Email (optional)" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} />
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={submit}>Upload & Import</button>
        </div>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {resp && <pre>{JSON.stringify(resp, null, 2)}</pre>}
      </div>

      <div className="card">
        <p><b>Tip:</b> You can use <code>samples/supplier_quote.csv</code> from the repo.</p>
      </div>
    </div>
  );
}
