import Link from "next/link";

export default function Home() {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">CleanNile Geospatial Intelligence Platform</h1>
          <p className="page-subtitle">
            Capture environmental incidents in the field, verify submissions through moderated workflows,
            and analyze pollution patterns through GIS-ready dashboards.
          </p>
        </div>
      </header>

      <div className="grid three">
        <article className="card dashboard-field">
          <h3>Quick Field Capture</h3>
          <p>Mobile-first reporting with GPS lock, camera capture, and offline queue support.</p>
        </article>
        <article className="card">
          <h3>Moderated Data Integrity</h3>
          <p>Administrator verification pipeline ensures only validated incidents reach map intelligence layers.</p>
        </article>
        <article className="card dashboard-admin">
          <h3>GIS Operations</h3>
          <p>Clustered mapping, hotspot heat analysis, and district-level trend tracking for response teams.</p>
        </article>
      </div>

      <div className="panel">
        <div className="grid two" style={{ marginBottom: "1.5rem" }}>
          <div className="panel" style={{ padding: "1.5rem" }}>
            <h4 style={{ marginBottom: "1rem", color: "var(--text)" }}>Get Started</h4>
            <div style={{ display: "flex", gap: "0.8rem", flexDirection: "column" }}>
              <Link href="/login" className="btn btn-primary" style={{ width: "100%" }}>
                Enter Platform
              </Link>
              <Link href="/capture" className="btn btn-secondary" style={{ width: "100%" }}>
                Quick Capture
              </Link>
            </div>
          </div>
          <div className="panel" style={{ padding: "1.5rem" }}>
            <h4 style={{ marginBottom: "1rem", color: "var(--text)" }}>Explore</h4>
            <Link href="/events" className="btn btn-ghost" style={{ width: "100%" }}>
              View Community Events
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
