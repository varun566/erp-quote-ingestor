import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <h1>ERP Quote Ingestor</h1>
      <p><small>Cloud-first mini project: CSV/ERP exports → Postgres → quote workflow</small></p>

      <div className="card">
        <div className="row">
          <Link href="/rfqs">1) Create RFQ</Link>
          <Link href="/imports">2) Import Supplier CSV</Link>
        </div>
      </div>

      <div className="card">
        <p><b>API URL</b></p>
        <pre>{process.env.NEXT_PUBLIC_API_URL || "NEXT_PUBLIC_API_URL not set"}</pre>
      </div>
    </div>
  );
}
