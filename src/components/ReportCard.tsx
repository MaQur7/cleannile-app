import Image from "next/image";
import type { ReportRecord } from "../lib/schemas";

type ReportCardProps = {
  report: ReportRecord;
  approveReport?: (id: string) => void;
  rejectReport?: (id: string) => void;
  showStatus?: boolean;
};

export default function ReportCard({
  report,
  approveReport,
  rejectReport,
  showStatus = false,
}: ReportCardProps) {
  const latitude = report.location?.latitude;
  const longitude = report.location?.longitude;

  return (
    <article className="card report-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.6rem",
          flexWrap: "wrap",
        }}
      >
        <h4 style={{ margin: 0, textTransform: "capitalize" }}>{report.category}</h4>

        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          <span className={`severity-badge ${report.severity}`}>{report.severity}</span>
          {showStatus && (
            <span className={`status-badge ${report.status}`}>{report.status}</span>
          )}
        </div>
      </div>

      <p style={{ marginTop: "0.7rem" }}>{report.description || "No description provided."}</p>

      <div className="report-meta-grid">
        <div>
          <p className="stat-label">District</p>
          <p className="muted" style={{ margin: 0 }}>{report.district}</p>
        </div>

        <div>
          <p className="stat-label">Coordinates</p>
          <p className="muted" style={{ margin: 0 }}>
            {latitude != null && longitude != null
              ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : "Not available"}
          </p>
        </div>
      </div>

      {report.photoURL && (
        <Image
          src={report.photoURL}
          alt="Report evidence"
          width={1280}
          height={720}
          className="report-photo"
          unoptimized
        />
      )}

      {approveReport && rejectReport && (
        <div
          style={{
            display: "flex",
            gap: "0.65rem",
            marginTop: "0.9rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => approveReport(report.id)}
          >
            Approve
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => rejectReport(report.id)}
          >
            Reject
          </button>
        </div>
      )}
    </article>
  );
}
