"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../components/providers/AuthProvider";
import ReportCard from "../../components/ReportCard";
import { db } from "../../lib/firebase";
import {
  normalizeReportDoc,
  normalizeUserDoc,
  type ReportRecord,
  type UserRecord,
} from "../../lib/schemas";

const PROFILE_REPORT_LIMIT = 100;

export default function ProfilePage() {
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserRecord | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let unsubscribeReports: (() => void) | undefined;

    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          setUserData(normalizeUserDoc(userDoc.id, userDoc.data()));
        }

        const reportQuery = query(
          collection(db, "reports"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(PROFILE_REPORT_LIMIT)
        );

        unsubscribeReports = onSnapshot(reportQuery, (snapshot) => {
          const data = snapshot.docs.map((item) =>
            normalizeReportDoc(item.id, item.data())
          );

          setReports(data);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error loading profile:", error);
        setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      if (unsubscribeReports) {
        unsubscribeReports();
      }
    };
  }, [user]);

  return (
    <AuthGuard>
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">
              Review your contributor details and the moderation status of submitted reports.
            </p>
          </div>
        </header>

        <div className="grid two">
          <div className="panel">
            <p className="stat-label">Email</p>
            <p className="stat-value" style={{ fontSize: "1rem" }}>
              {user?.email ?? "Unknown"}
            </p>
          </div>
          <div className="panel">
            <p className="stat-label">Role</p>
            <p className="stat-value" style={{ textTransform: "capitalize" }}>
              {role ?? userData?.role ?? "user"}
            </p>
          </div>
        </div>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>My Reports</h2>

          {loading && <p className="muted">Loading your reports...</p>}

          {!loading && reports.length === 0 && (
            <div className="empty-state">You have not submitted any reports yet.</div>
          )}

          {!loading && reports.length > 0 && (
            <div className="grid">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} showStatus />
              ))}
            </div>
          )}
        </section>
      </section>
    </AuthGuard>
  );
}
