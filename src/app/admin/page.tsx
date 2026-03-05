"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import AdminGuard from "../../components/AdminGuard";
import ReportCard from "../../components/ReportCard";
import PageLoader from "../../components/ui/PageLoader";
import { useAuth } from "../../components/providers/AuthProvider";
import { db } from "../../lib/firebase";
import { normalizeReportDoc, type ReportRecord } from "../../lib/schemas";

const AdminStats = dynamic(() => import("../../components/AdminStats"), {
  ssr: false,
  loading: () => (
    <div className="panel muted" style={{ marginTop: "1rem" }}>
      Loading analytics dashboard...
    </div>
  ),
});

type StatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminPage() {
  const { getIdToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState<ReportRecord[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [message, setMessage] = useState("");

  const refreshCounts = async () => {
    const reportsRef = collection(db, "reports");

    const [pendingSnap, approvedSnap, rejectedSnap] = await Promise.all([
      getCountFromServer(query(reportsRef, where("status", "==", "pending"))),
      getCountFromServer(query(reportsRef, where("status", "==", "approved"))),
      getCountFromServer(query(reportsRef, where("status", "==", "rejected"))),
    ]);

    setCounts({
      pending: pendingSnap.data().count,
      approved: approvedSnap.data().count,
      rejected: rejectedSnap.data().count,
    });
  };

  useEffect(() => {
    const pendingQuery = query(
      collection(db, "reports"),
      where("status", "==", "pending"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) =>
          normalizeReportDoc(item.id, item.data())
        );

        setPendingReports(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading pending reports:", error);
        setLoading(false);
      }
    );

    let cancelled = false;

    const loadInitialCounts = async () => {
      try {
        const reportsRef = collection(db, "reports");

        const [pendingSnap, approvedSnap, rejectedSnap] = await Promise.all([
          getCountFromServer(query(reportsRef, where("status", "==", "pending"))),
          getCountFromServer(
            query(reportsRef, where("status", "==", "approved"))
          ),
          getCountFromServer(
            query(reportsRef, where("status", "==", "rejected"))
          ),
        ]);

        if (!cancelled) {
          setCounts({
            pending: pendingSnap.data().count,
            approved: approvedSnap.data().count,
            rejected: rejectedSnap.data().count,
          });
        }
      } catch (error) {
        console.error("Error loading report counts:", error);
      }
    };

    void loadInitialCounts();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setSuccessMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  };

  const updateReportStatus = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    const token = await getIdToken();
    if (!token) {
      throw new Error("Session expired. Please sign in again.");
    }

    const response = await fetch(`/api/admin/reports/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(payload.error ?? "Failed to update report status");
    }

    await refreshCounts();
  };

  const approveReport = async (id: string) => {
    try {
      await updateReportStatus(id, "approved");
      setSuccessMessage("Report approved successfully.");
    } catch (error) {
      console.error("Approve failed:", error);
      alert(errorMessage(error, "Failed to approve report"));
    }
  };

  const rejectReport = async (id: string) => {
    try {
      await updateReportStatus(id, "rejected");
      setSuccessMessage("Report rejected successfully.");
    } catch (error) {
      console.error("Reject failed:", error);
      alert(errorMessage(error, "Failed to reject report"));
    }
  };

  return (
    <AdminGuard>
      {loading ? (
        <PageLoader
          title="Loading moderation queue"
          description="Fetching pending reports and moderation metrics."
        />
      ) : (
        <section className="page">
          <header className="page-header">
            <div>
              <h1 className="page-title">Admin Moderation Panel</h1>
              <p className="page-subtitle">
                Review pending submissions, enforce data quality, and monitor moderation throughput.
              </p>
            </div>
          </header>

          {message && (
            <div className="panel" style={{ borderColor: "rgba(15, 118, 110, 0.4)", color: "#0f766e" }}>
              {message}
            </div>
          )}

          <div className="stats-row">
            <article className="stat-tile">
              <p className="stat-label">Pending</p>
              <p className="stat-value">{counts.pending}</p>
            </article>
            <article className="stat-tile">
              <p className="stat-label">Approved</p>
              <p className="stat-value">{counts.approved}</p>
            </article>
            <article className="stat-tile">
              <p className="stat-label">Rejected</p>
              <p className="stat-value">{counts.rejected}</p>
            </article>
          </div>

          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Pending Reports</h2>

            {pendingReports.length === 0 ? (
              <div className="empty-state">No pending reports right now.</div>
            ) : (
              <div className="grid">
                {pendingReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    approveReport={approveReport}
                    rejectReport={rejectReport}
                  />
                ))}
              </div>
            )}
          </section>

          <AdminStats />
        </section>
      )}
    </AdminGuard>
  );
}
