"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  normalizeEventDoc,
  normalizeReportDoc,
  toDate,
  type EventRecord,
  type ReportRecord,
} from "../lib/schemas";

const REPORT_PAGE_SIZE = 200;
const REPORT_MAX_PAGES = 5;
const EVENT_PAGE_SIZE = 200;
const EVENT_MAX_PAGES = 5;

const BAR_COLOR = "#118ab2";
const SECONDARY_BAR_COLOR = "#0f766e";
const TREND_COLOR = "#0f4c81";
const STATUS_COLORS = ["#16a34a", "#dc2626", "#f59e0b"];
const GRID_COLOR = "rgba(148, 163, 184, 0.3)";

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #d7dde5",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
  color: "#0f172a",
};

function escapeCsv(value: unknown) {
  const text = String(value ?? "");

  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadText(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminStats() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    approved: 0,
    rejected: 0,
    pending: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      const reportsRef = collection(db, "reports");

      const [totalSnap, approvedSnap, rejectedSnap, pendingSnap] =
        await Promise.all([
          getCountFromServer(reportsRef),
          getCountFromServer(query(reportsRef, where("status", "==", "approved"))),
          getCountFromServer(query(reportsRef, where("status", "==", "rejected"))),
          getCountFromServer(query(reportsRef, where("status", "==", "pending"))),
        ]);

      setTotalReports(totalSnap.data().count);
      setStatusCounts({
        approved: approvedSnap.data().count,
        rejected: rejectedSnap.data().count,
        pending: pendingSnap.data().count,
      });

      const pagedReports: ReportRecord[] = [];
      let lastReportDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      for (let page = 0; page < REPORT_MAX_PAGES; page += 1) {
        const constraints: QueryConstraint[] = [
          orderBy("createdAt", "desc"),
          limit(REPORT_PAGE_SIZE),
        ];

        if (lastReportDoc) {
          constraints.push(startAfter(lastReportDoc));
        }

        const pageSnapshot = await getDocs(query(reportsRef, ...constraints));

        if (pageSnapshot.empty) {
          break;
        }

        const normalized = pageSnapshot.docs.map((item) =>
          normalizeReportDoc(item.id, item.data())
        );

        pagedReports.push(...normalized);
        lastReportDoc = pageSnapshot.docs[pageSnapshot.docs.length - 1];

        if (pageSnapshot.docs.length < REPORT_PAGE_SIZE) {
          break;
        }
      }

      setReports(pagedReports);

      const eventsRef = collection(db, "events");
      const pagedEvents: EventRecord[] = [];
      let lastEventDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      for (let page = 0; page < EVENT_MAX_PAGES; page += 1) {
        const constraints: QueryConstraint[] = [
          orderBy(documentId()),
          limit(EVENT_PAGE_SIZE),
        ];

        if (lastEventDoc) {
          constraints.push(startAfter(lastEventDoc));
        }

        const pageSnapshot = await getDocs(query(eventsRef, ...constraints));

        if (pageSnapshot.empty) {
          break;
        }

        const normalized = pageSnapshot.docs.map((item) =>
          normalizeEventDoc(item.id, item.data())
        );

        pagedEvents.push(...normalized);
        lastEventDoc = pageSnapshot.docs[pageSnapshot.docs.length - 1];

        if (pageSnapshot.docs.length < EVENT_PAGE_SIZE) {
          break;
        }
      }

      setEvents(pagedEvents);
      setLoading(false);
    };

    loadData().catch((error) => {
      console.error("Error loading admin statistics:", error);
      setLoading(false);
    });
  }, []);

  const categoryData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};

    reports.forEach((report) => {
      categoryCounts[report.category] = (categoryCounts[report.category] || 0) + 1;
    });

    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};

    reports.forEach((report) => {
      counts[report.severity] = (counts[report.severity] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [reports]);

  const statusData = useMemo(
    () => [
      { name: "Approved", value: statusCounts.approved },
      { name: "Rejected", value: statusCounts.rejected },
      { name: "Pending", value: statusCounts.pending },
    ],
    [statusCounts]
  );

  const monthlyData = useMemo(() => {
    type MonthBucket = { label: string; order: number; reports: number };
    const monthlyMap = new Map<string, MonthBucket>();

    reports.forEach((report) => {
      const createdDate = toDate(report.createdAt);
      if (!createdDate) {
        return;
      }

      const year = createdDate.getUTCFullYear();
      const month = createdDate.getUTCMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = createdDate.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      const current = monthlyMap.get(key);
      if (current) {
        current.reports += 1;
        return;
      }

      monthlyMap.set(key, {
        label,
        order: year * 12 + month,
        reports: 1,
      });
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ month: item.label, reports: item.reports }));
  }, [reports]);

  const districtData = useMemo(() => {
    const counts: Record<string, number> = {};

    reports.forEach((report) => {
      const district = report.district || "Unassigned";
      counts[district] = (counts[district] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);
  }, [reports]);

  const totalVolunteers = useMemo(
    () => events.reduce((sum, event) => sum + event.volunteers.length, 0),
    [events]
  );

  const approvalRate = useMemo(() => {
    if (!totalReports) {
      return 0;
    }

    return Math.round((statusCounts.approved / totalReports) * 100);
  }, [statusCounts.approved, totalReports]);

  const exportReportsCSV = () => {
    if (!reports.length) {
      alert("No report data loaded.");
      return;
    }

    const headers = [
      "id",
      "category",
      "severity",
      "district",
      "description",
      "status",
      "latitude",
      "longitude",
      "userId",
      "moderatedBy",
    ];

    const rows = reports.map((report) => [
      report.id,
      report.category,
      report.severity,
      report.district,
      report.description,
      report.status,
      report.location?.latitude ?? "",
      report.location?.longitude ?? "",
      report.userId,
      report.moderatedBy ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    downloadText(csvContent, "cleannile_reports_summary.csv", "text/csv;charset=utf-8");
  };

  const exportEventsCSV = () => {
    if (!events.length) {
      alert("No event data loaded.");
      return;
    }

    const headers = ["id", "title", "description", "date", "district", "volunteerCount"];

    const rows = events.map((event) => [
      event.id,
      event.title,
      event.description,
      event.date,
      event.district,
      event.volunteers.length,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    downloadText(csvContent, "cleannile_events_summary.csv", "text/csv;charset=utf-8");
  };

  if (loading) {
    return <div className="panel muted">Loading statistics...</div>;
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h2 className="page-title" style={{ fontSize: "1.5rem" }}>
            Environmental Intelligence Dashboard
          </h2>
          <p className="page-subtitle">
            Moderation outcomes, severity distribution, and district-level trends.
          </p>
        </div>
      </header>

      <div className="stats-row">
        <article className="stat-tile">
          <p className="stat-label">Total Reports</p>
          <p className="stat-value">{totalReports}</p>
        </article>
        <article className="stat-tile">
          <p className="stat-label">Approval Rate</p>
          <p className="stat-value">{approvalRate}%</p>
        </article>
        <article className="stat-tile">
          <p className="stat-label">Total Volunteers</p>
          <p className="stat-value">{totalVolunteers}</p>
        </article>
      </div>

      <div className="panel chart-toolbar">
        <button type="button" className="btn btn-secondary btn-sm" onClick={exportReportsCSV}>
          Download Reports CSV
        </button>

        <button type="button" className="btn btn-primary btn-sm" onClick={exportEventsCSV}>
          Download Events CSV
        </button>

        <span className="chart-chip primary">Trend</span>
        <span className="chart-chip success">Approved</span>
        <span className="chart-chip danger">Rejected</span>
        <span className="chart-chip warning">Pending</span>
      </div>

      <article className="panel chart-panel">
        <h3 className="chart-title">Pollution by Category (Sampled)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="name" tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill={BAR_COLOR} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="panel chart-panel">
        <h3 className="chart-title">Severity Distribution (Sampled)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={severityData}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="name" tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill={SECONDARY_BAR_COLOR} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="panel chart-panel">
        <h3 className="chart-title">Report Status (All Reports)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={120} label>
              {statusData.map((entry, index) => (
                <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </article>

      <article className="panel chart-panel">
        <h3 className="chart-title">District Hotspots (Top 8)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={districtData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis type="number" tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#556072" }} width={120} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="panel chart-panel">
        <h3 className="chart-title">Monthly Trends (Sampled)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="month" tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#556072" }} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="reports"
              stroke={TREND_COLOR}
              strokeWidth={2.8}
              dot={{ fill: TREND_COLOR, r: 3.2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </article>
    </section>
  );
}
