"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  Tooltip,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L, { type Layer, type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  normalizeReportDoc,
  type ReportCategory,
  type ReportRecord,
  type ReportSeverity,
  type ReportStatus,
} from "../lib/schemas";
import { useAuth } from "./providers/AuthProvider";
import {
  DEFAULT_CLUSTER_CONFIG,
  DEFAULT_GIS_LAYER_CONFIGS,
  DEFAULT_HEATMAP_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG,
  type GISLayerConfig,
  type GISLayerType,
  calculateIntensity,
} from "../lib/gis-layers";
import {
  aggregateByPeriod,
  analyzeTrends,
  generateTimePeriods,
  getStartOfPeriod,
  type TemporalGranularity,
  type TemporalDataPoint,
} from "../lib/temporal-analysis";

// Dynamically import heavy components
const LayerControlPanel = dynamic(() => import("./gis/LayerControlPanel"), {
  ssr: false,
});
const TemporalSlider = dynamic(() => import("./gis/TemporalSlider"), {
  ssr: false,
});
const HeatmapLegend = dynamic(() => import("./gis/HeatmapLegend"), {
  ssr: false,
});

type LeafletDefaultIcon = {
  _getIconUrl?: unknown;
};

type LeafletHeatExtension = typeof L & {
  heatLayer?: (
    latlngs: Array<[number, number, number]>,
    options: {
      radius: number;
      blur: number;
      maxZoom: number;
      minOpacity?: number;
      maxOpacity?: number;
      gradient?: Record<number, string>;
    }
  ) => Layer;
};

const leafletWithHeat = L as LeafletHeatExtension;
delete (L.Icon.Default.prototype as LeafletDefaultIcon)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const CENTER: LatLngTuple = [4.8594, 31.5713];
const FETCH_LIMIT = 260;

type TimeWindow = "7d" | "30d" | "90d" | "all";

type SearchResponse = {
  reports: Array<Record<string, unknown>>;
  meta?: {
    nextCursor?: string | null;
    scanned?: number;
    returned?: number;
  };
};

function boundsKey(map: L.Map) {
  const bounds = map.getBounds();
  return [
    bounds.getSouth().toFixed(4),
    bounds.getWest().toFixed(4),
    bounds.getNorth().toFixed(4),
    bounds.getEast().toFixed(4),
  ].join(",");
}

function ViewportWatcher({ onViewportChange }: { onViewportChange: (bbox: string) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onViewportChange(boundsKey(map));
    },
    zoomend: () => {
      onViewportChange(boundsKey(map));
    },
  });

  useEffect(() => {
    onViewportChange(boundsKey(map));
  }, [map, onViewportChange]);

  return null;
}

/**
 * Advanced Heatmap Layer with configurable intensity and gradient
 */
function AdvancedHeatmapLayer({
  reports,
  config,
  temporalFilter,
  heatReady,
  enabled,
}: {
  reports: ReportRecord[];
  config: typeof DEFAULT_HEATMAP_CONFIG;
  temporalFilter?: TemporalDataPoint | null;
  heatReady: boolean;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !heatReady || !reports.length || !leafletWithHeat.heatLayer) {
      return;
    }

    const heatPoints = reports
      .map((report) => {
        const lat = report.location?.latitude;
        const lng = report.location?.longitude;

        if (lat == null || lng == null) {
          return null;
        }

        const intensity = calculateIntensity(report.severity, 1, false);
        return [lat, lng, intensity] as [number, number, number];
      })
      .filter((point): point is [number, number, number] => point !== null);

    if (!heatPoints.length) {
      return;
    }

    const heatLayer = leafletWithHeat.heatLayer(heatPoints, {
      radius: config.radius,
      blur: config.blur,
      maxZoom: config.maxZoom,
      minOpacity: config.minOpacity,
      maxOpacity: config.maxOpacity,
      gradient: config.gradient,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [enabled, heatReady, map, reports, config]);

  return null;
}

/**
 * Cluster rendering with smart aggregation
 */
function ClusterLayer({
  reports,
  config,
  layerConfig,
}: {
  reports: ReportRecord[];
  config: typeof DEFAULT_CLUSTER_CONFIG;
  layerConfig: GISLayerConfig;
}) {
  const iconSize: LatLngTuple = [25, 41];

  const createClusterIcon = (cluster: any) => {
    const childCount = cluster.getChildCount();
    const hasCritical = cluster.getAllChildren().some((m: any) => m.options.data?.severity === "critical");

    let bgColor = config.clusterBgColor;
    if (hasCritical) {
      bgColor = "#dc2626"; // red for critical
    } else if (childCount > 10) {
      bgColor = "#f97316"; // orange for large clusters
    }

    return L.divIcon({
      html: `<div style="background-color: ${bgColor}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white; border: 2px solid white;">
        ${childCount}
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  if (!config.enabled) {
    return (
      <>
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.location?.latitude || 0, report.location?.longitude || 0]}
            title={report.description}
          >
            <PopupContent report={report} />
          </Marker>
        ))}
      </>
    );
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={config.radius}
      iconCreateFunction={createClusterIcon}
      maxZoom={config.maxZoom}
    >
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.location?.latitude || 0, report.location?.longitude || 0]}
          data={report}
          title={report.description}
        >
          <PopupContent report={report} />
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

/**
 * Marker popup content
 */
function PopupContent({ report }: { report: ReportRecord }) {
  const createdDate = new Date(report.createdAt as any).toLocaleDateString();

  return (
    <Popup>
      <div style={{ maxWidth: "250px" }}>
        <h4 style={{ margin: "0 0 8px 0" }}>{report.category.toUpperCase()}</h4>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
          <strong>Severity:</strong> <span style={{ color: getSeverityColor(report.severity) }}>
            {report.severity.toUpperCase()}
          </span>
        </p>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
          <strong>District:</strong> {report.district}
        </p>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
          <strong>Status:</strong> {report.status.toUpperCase()}
        </p>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
          <strong>Date:</strong> {createdDate}
        </p>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>{report.description}</p>
        {report.photoURL && (
          <img
            src={report.photoURL}
            alt="Report"
            style={{ maxWidth: "100%", maxHeight: "150px", marginTop: "8px" }}
          />
        )}
      </div>
    </Popup>
  );
}

function getSeverityColor(severity: ReportSeverity): string {
  const colors: Record<ReportSeverity, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef5350",
    critical: "#dc2626",
  };
  return colors[severity];
}

type TimeWindow = "7d" | "30d" | "90d" | "all";

function toDays(window: TimeWindow) {
  if (window === "7d") {
    return 7;
  }
  if (window === "30d") {
    return 30;
  }
  if (window === "90d") {
    return 90;
  }
  return null;
}

/**
 * Enhanced MapView component with GIS layers, temporal analysis, and clustering
 */
export default function EnhancedMapView() {
  const { getIdToken } = useAuth();

  // State management
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bbox, setBbox] = useState("");

  // Filter state
  const [status, setStatus] = useState<ReportStatus>("approved");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [severity, setSeverity] = useState<ReportSeverity | "all">("all");
  const [district, setDistrict] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");

  // GIS layer state
  const [layerConfigs, setLayerConfigs] = useState<Record<GISLayerType, GISLayerConfig>>(
    DEFAULT_GIS_LAYER_CONFIGS
  );

  // Heatmap and clustering state
  const [clusterConfig, setClusterConfig] = useState(DEFAULT_CLUSTER_CONFIG);
  const [heatmapConfig, setHeatmapConfig] = useState(DEFAULT_HEATMAP_CONFIG);
  const [heatReady, setHeatReady] = useState(false);

  // Temporal analysis state
  const [temporalEnabled, setTemporalEnabled] = useState(false);
  const [temporalGranularity, setTemporalGranularity] = useState<TemporalGranularity>("day");
  const [temporalDataPoints, setTemporalDataPoints] = useState<TemporalDataPoint[]>([]);
  const [selectedTemporalIndex, setSelectedTemporalIndex] = useState<number | null>(null);

  const requestControllerRef = useRef<AbortController | null>(null);

  // Load heatmap plugin
  useEffect(() => {
    let mounted = true;

    import("leaflet.heat")
      .then(() => {
        if (mounted) {
          setHeatReady(true);
        }
      })
      .catch((error) => {
        console.error("Heat layer plugin failed to load", error);
        if (mounted) {
          setHeatReady(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Perform spatial query
  const runQuery = useCallback(
    async (mode: "replace" | "append") => {
      if (!bbox) {
        return;
      }

      if (mode === "replace") {
        setLoading(true);
      }

      setError("");

      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }

      const controller = new AbortController();
      requestControllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          status,
          bbox,
          limit: String(FETCH_LIMIT),
          ...(category !== "all" && { category }),
          ...(severity !== "all" && { severity }),
          ...(district && { district }),
        });

        if (timeWindow !== "all") {
          const days = toDays(timeWindow)!;
          const from = new Date();
          from.setDate(from.getDate() - days);
          params.set("from", from.toISOString());
        }

        const token = await getIdToken();
        const response = await fetch(`/api/reports/search?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = (await response.json()) as SearchResponse;
        const normalized = data.reports.map((doc: any) =>
          normalizeReportDoc(doc.id, doc)
        );

        setReports(normalized);

        // Generate temporal data if enabled
        if (temporalEnabled) {
          const startDate = new Date();
          if (timeWindow !== "all") {
            startDate.setDate(startDate.getDate() - (toDays(timeWindow) || 30));
          } else {
            startDate.setMonth(startDate.getMonth() - 6);
          }

          const endDate = new Date();
          const dataPoints = aggregateByPeriod(
            normalized,
            startDate,
            endDate,
            temporalGranularity
          );
          setTemporalDataPoints(dataPoints);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [bbox, status, category, severity, district, timeWindow, temporalEnabled, temporalGranularity, getIdToken]
  );

  // Update query when filters change
  useEffect(() => {
    runQuery("replace");
  }, [runQuery]);

  // Filter reports based on selected temporal point
  const filteredReports = useMemo(() => {
    if (!temporalEnabled || selectedTemporalIndex === null || !temporalDataPoints[selectedTemporalIndex]) {
      return reports;
    }

    const selectedPoint = temporalDataPoints[selectedTemporalIndex];
    const nextPoint = temporalDataPoints[selectedTemporalIndex + 1];

    return reports.filter((r) => {
      const date = new Date(r.createdAt as any).getTime();
      return (
        date >= selectedPoint.timestamp &&
        date < (nextPoint?.timestamp || new Date().getTime())
      );
    });
  }, [reports, temporalEnabled, selectedTemporalIndex, temporalDataPoints]);

  const pollutionLayer = useMemo(
    () =>
      filteredReports.filter((r) =>
        layerConfigs["pollution-reports"].visible ? ["pollution", "waste", "water"].includes(r.category) : false
      ),
    [filteredReports, layerConfigs]
  );

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      {/* Controls Panel */}
      <div
        style={{
          padding: "16px",
          background: "#f8f9fa",
          borderBottom: "1px solid #e0e0e0",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
            style={{ padding: "8px" }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory | "all")}
            style={{ padding: "8px" }}
          >
            <option value="all">All Categories</option>
            <option value="pollution">Pollution</option>
            <option value="waste">Waste</option>
            <option value="water">Water</option>
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as ReportSeverity | "all")}
            style={{ padding: "8px" }}
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
            style={{ padding: "8px" }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Filter by district..."
            style={{ padding: "8px", maxWidth: "200px" }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={clusterConfig.enabled}
              onChange={(e) => setClusterConfig({ ...clusterConfig, enabled: e.target.checked })}
            />
            Enable Clustering
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={heatmapConfig.enabled}
              onChange={(e) => setHeatmapConfig({ ...heatmapConfig, enabled: e.target.checked })}
            />
            Enable Heatmap
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={temporalEnabled}
              onChange={(e) => setTemporalEnabled(e.target.checked)}
            />
            Temporal Analysis
          </label>
        </div>

        {error && (
          <div style={{ color: "#dc2626", padding: "8px", fontSize: "14px" }}>
            Error: {error}
          </div>
        )}

        <div style={{ fontSize: "12px", color: "#666" }}>
          {loading ? "Loading..." : `Showing ${filteredReports.length} reports`}
        </div>
      </div>

      {/* Temporal Slider */}
      {temporalEnabled && temporalDataPoints.length > 0 && (
        <TemporalSlider
          dataPoints={temporalDataPoints}
          selectedIndex={selectedTemporalIndex}
          onSelect={setSelectedTemporalIndex}
          granularity={temporalGranularity}
        />
      )}

      {/* Map Container */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer center={CENTER} zoom={11} style={{ height: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ViewportWatcher onViewportChange={setBbox} />

          {/* Heatmap Layer */}
          {heatmapConfig.enabled && (
            <AdvancedHeatmapLayer
              reports={filteredReports}
              config={heatmapConfig}
              temporalFilter={selectedTemporalIndex !== null ? temporalDataPoints[selectedTemporalIndex] : null}
              heatReady={heatReady}
              enabled={true}
            />
          )}

          {/* Cluster Layer */}
          <ClusterLayer
            reports={filteredReports}
            config={clusterConfig}
            layerConfig={layerConfigs["pollution-reports"]}
          />

          {/* Heatmap Legend */}
          {heatmapConfig.enabled && <HeatmapLegend />}
        </MapContainer>
      </div>
    </div>
  );
}
