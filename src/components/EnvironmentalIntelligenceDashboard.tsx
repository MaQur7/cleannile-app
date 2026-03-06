"use client";

import { useEffect, useMemo, useState } from "react";
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
  db,
} from "../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
} from "firebase/firestore";
import {
  generateEnvironmentalIndicators,
  generatePollutionHotspots,
  analyzePollutionTrends,
  type EnvironmentalIndicators,
  type PollutionTrendInsight,
} from "../lib/environmental-analytics";
import { normalizeReportDoc, normalizeEventDoc, toDate } from "../lib/schemas";

const BAR_COLOR = "#118ab2";
const SECONDARY_BAR_COLOR = "#0f766e";
const TREND_COLOR = "#0f4c81";
const CATEGORY_COLORS: Record<string, string> = {
  pollution: "#ef4444",
  waste: "#ec4899",
  water: "#3b82f6",
};
const GRID_COLOR = "rgba(148, 163, 184, 0.3)";

interface DashboardMetrics {
  indicators: EnvironmentalIndicators | null;
  trends: PollutionTrendInsight[];
  hotspots: any[];
  loading: boolean;
  error: string;
}

/**
 * Environmental Intelligence Dashboard
 * Provides comprehensive analytics for environmental monitoring
 */
export default function EnvironmentalIntelligenceDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    indicators: null,
    trends: [],
    hotspots: [],
    loading: true,
    error: "",
  });

  // Fetch and analyze data
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch all approved reports
        const reportsRef = collection(db, "reports");
        const reportsQuery = query(
          reportsRef,
          where("status", "==", "approved"),
          orderBy("createdAt", "desc"),
          limit(2000)
        );

        const reportsSnapshot = await getDocs(reportsQuery);
        const reports = reportsSnapshot.docs.map((doc) =>
          normalizeReportDoc(doc.id, doc.data())
        );

        // Fetch all events
        const eventsRef = collection(db, "events");
        const eventsSnapshot = await getDocs(eventsRef);
        const events = eventsSnapshot.docs.map((doc) =>
          normalizeEventDoc(doc.id, doc.data())
        );

        // Generate indicators
        const indicators = generateEnvironmentalIndicators(reports, events);

        // Analyze trends
        const trends = analyzePollutionTrends(reports, 30);

        // Generate hotspots
        const hotspots = generatePollutionHotspots(reports, 0.1);

        setMetrics({
          indicators,
          trends,
          hotspots: hotspots.slice(0, 10), // Top 10 hotspots
          loading: false,
          error: "",
        });
      } catch (err) {
        setMetrics((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load metrics",
        }));
      }
    };

    fetchMetrics();
  }, []);

  const categoryData = useMemo(() => {
    if (!metrics.indicators) return [];
    return [
      { name: "Pollution", value: metrics.trends[0]?.criticalReportsLastMonth || 0 },
      { name: "Waste", value: metrics.trends[1]?.criticalReportsLastMonth || 0 },
      { name: "Water", value: metrics.trends[2]?.criticalReportsLastMonth || 0 },
    ];
  }, [metrics]);

  const hotspotData = useMemo(() => {
    return metrics.hotspots.slice(0, 8).map((h, idx) => ({
      id: `Hotspot ${idx + 1}`,
      reports: h.reportCount,
      risk: h.riskLevel === "critical" ? 4 : h.riskLevel === "high" ? 3 : h.riskLevel === "medium" ? 2 : 1,
    }));
  }, [metrics.hotspots]);

  if (metrics.loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div>Loading environmental analytics...</div>
      </div>
    );
  }

  if (metrics.error) {
    return (
      <div style={{ padding: "20px", color: "#dc2626" }}>
        Error: {metrics.error}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", background: "#f8fafc" }}>
      <h1 style={{ marginTop: 0, color: "#1e293b" }}>Environmental Intelligence Dashboard</h1>

      {/* Key Indicators */}
      {metrics.indicators && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}>
          <IndicatorCard
            label="Total Reports (Month)"
            value={metrics.indicators.totalReportsMonthly}
            trend={metrics.indicators.trendSummary}
            color="#3b82f6"
          />
          <IndicatorCard
            label="Average Severity"
            value={metrics.indicators.avgSeverityMonthly.toFixed(2)}
            trend="out of 4.0"
            color={metrics.indicators.avgSeverityMonthly > 2.5 ? "#ef4444" : "#10b981"}
          />
          <IndicatorCard
            label="Critical Incidents"
            value={metrics.indicators.criticalIncidentsMonthly}
            trend="this month"
            color={metrics.indicators.criticalIncidentsMonthly > 5 ? "#ef4444" : "#f59e0b"}
          />
          <IndicatorCard
            label="Cleanup Events"
            value={metrics.indicators.cleanupEventsMonthly}
            trend={`${metrics.indicators.volunteerParticipationMonthly} volunteers`}
            color="#10b981"
          />
        </div>
      )}

      {/* Main Charts */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}>
        {/* Category Distribution */}
        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <h3 style={{ marginTop: 0, fontSize: "16px" }}>Critical Incidents by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.name === "Pollution"
                        ? "#ef4444"
                        : entry.name === "Waste"
                          ? "#ec4899"
                          : "#3b82f6"
                    }
                  />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Level Distribution */}
        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <h3 style={{ marginTop: 0, fontSize: "16px" }}>Top Pollution Hotspots</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hotspotData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="id" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="reports" fill={BAR_COLOR} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pollution Trends */}
      <div style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
        <h3 style={{ marginTop: 0, fontSize: "16px", marginBottom: "16px" }}>
          Pollution Trends by Category
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}>
          {metrics.trends.map((trend) => (
            <TrendCard key={trend.category} trend={trend} />
          ))}
        </div>
      </div>

      {/* Hotspots Table */}
      <div style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginTop: "16px",
      }}>
        <h3 style={{ marginTop: 0, fontSize: "16px", marginBottom: "16px" }}>
          Critical Hotspots Map
        </h3>

        <div style={{
          overflowX: "auto",
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px", fontWeight: "600" }}>
                  Location
                </th>
                <th style={{ textAlign: "left", padding: "8px", fontWeight: "600" }}>
                  District
                </th>
                <th style={{ textAlign: "center", padding: "8px", fontWeight: "600" }}>
                  Reports
                </th>
                <th style={{ textAlign: "center", padding: "8px", fontWeight: "600" }}>
                  Avg Severity
                </th>
                <th style={{ textAlign: "center", padding: "8px", fontWeight: "600" }}>
                  Risk Level
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.hotspots.slice(0, 10).map((hotspot, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>
                    {hotspot.latitude.toFixed(3)}, {hotspot.longitude.toFixed(3)}
                  </td>
                  <td style={{ padding: "8px" }}>{hotspot.district}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    {hotspot.reportCount}
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    {hotspot.avgSeverity.toFixed(2)}
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor:
                        hotspot.riskLevel === "critical"
                          ? "#fee2e2"
                          : hotspot.riskLevel === "high"
                            ? "#fef3c7"
                            : "#dbeafe",
                      color:
                        hotspot.riskLevel === "critical"
                          ? "#dc2626"
                          : hotspot.riskLevel === "high"
                            ? "#d97706"
                            : "#2563eb",
                    }}>
                      {hotspot.riskLevel.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Indicator Card Component
 */
function IndicatorCard({
  label,
  value,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  trend: string;
  color: string;
}) {
  return (
    <div style={{
      background: "white",
      padding: "16px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: "700", color: color, marginBottom: "8px" }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "#999" }}>
        {trend}
      </div>
    </div>
  );
}

/**
 * Trend Card Component
 */
function TrendCard({ trend }: { trend: PollutionTrendInsight }) {
  const trendIcon =
    trend.trend === "improving" ? "📈" : trend.trend === "worsening" ? "📉" : "➡️";
  const trendColor =
    trend.trend === "improving" ? "#10b981" : trend.trend === "worsening" ? "#ef4444" : "#f59e0b";

  return (
    <div style={{
      padding: "12px",
      borderRadius: "6px",
      background: "#f8fafc",
      borderLeft: `3px solid ${trendColor}`,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px",
      }}>
        <h4 style={{ margin: 0, textTransform: "capitalize", fontSize: "14px", fontWeight: "600" }}>
          {trend.category}
        </h4>
        <span style={{ fontSize: "16px" }}>{trendIcon}</span>
      </div>
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>
        <strong style={{ color: trendColor }}>
          {trend.changePercentage > 0 ? "+" : ""}
          {trend.changePercentage.toFixed(1)}%
        </strong>{" "}
        change
      </div>
      <div style={{ fontSize: "11px", color: "#999", marginBottom: "4px" }}>
        Critical: {trend.criticalReportsLastMonth} | Hotspots: {trend.hotspotCount}
      </div>
      <div style={{ fontSize: "11px", color: "#999" }}>
        Areas: {trend.affectedDistricts.slice(0, 2).join(", ")}
      </div>
    </div>
  );
}
