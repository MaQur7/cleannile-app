"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import AdminGuard from "../../../components/AdminGuard";
import ReportCard from "../../../components/ReportCard";
import { db } from "../../../lib/firebase";
import { normalizeReportDoc, type ReportRecord } from "../../../lib/schemas";

const APPROVED_REPORT_LIMIT = 200;

export default function ApprovedReports() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      const approvedQuery = query(
        collection(db, "reports"),
        where("status", "==", "approved"),
        orderBy("createdAt", "desc"),
        limit(APPROVED_REPORT_LIMIT)
      );

      const snapshot = await getDocs(approvedQuery);

      const data = snapshot.docs.map((item) =>
        normalizeReportDoc(item.id, item.data())
      );

      setReports(data);
      setLoading(false);
    };

    loadReports().catch((error) => {
      console.error("Error loading approved reports:", error);
      setLoading(false);
    });
  }, []);

  return (
    <AdminGuard>
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Approved Reports</h1>
            <p className="page-subtitle">
              Published reports visible to the geospatial map and public data surfaces.
            </p>
          </div>
        </header>

        {loading && <div className="panel muted">Loading approved reports...</div>}

        {!loading && reports.length === 0 && (
          <div className="empty-state">No approved reports found.</div>
        )}

        {!loading && reports.length > 0 && (
          <div className="grid">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} showStatus />
            ))}
          </div>
        )}
      </section>
    </AdminGuard>
  );
}
