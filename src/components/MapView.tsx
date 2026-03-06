"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L, { type Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  normalizeReportDoc,
  type ReportCategory,
  type ReportRecord,
  type ReportSeverity,
  type ReportStatus,
} from "../lib/schemas";
import { useAuth } from "./providers/AuthProvider";

type LeafletDefaultIcon = {
  _getIconUrl?: unknown;
};

type LeafletHeatExtension = typeof L & {
  heatLayer?: (
    latlngs: Array<[number, number, number]>,
    options: { radius: number; blur: number; maxZoom: number }
  ) => Layer;
};

const leafletWithHeat = L as LeafletHeatExtension;
delete (L.Icon.Default.prototype as LeafletDefaultIcon)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const CENTER: [number, number] = [4.8594, 31.5713];
const FETCH_LIMIT = 260;
const MAX_RENDER_MARKERS = 1200;

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

function HeatmapLayer({
  reports,
  heatReady,
  heatEnabled,
}: {
  reports: ReportRecord[];
  heatReady: boolean;
  heatEnabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!heatEnabled || !heatReady || !reports.length || !leafletWithHeat.heatLayer) {
      return;
    }

    const heatPoints = reports
      .map((report) => {
        const lat = report.location?.latitude;
        const lng = report.location?.longitude;

        if (lat == null || lng == null) {
          return null;
        }

        const intensity =
          report.severity === "critical"
            ? 0.95
            : report.severity === "high"
              ? 0.8
              : report.severity === "medium"
                ? 0.65
                : 0.5;

        return [lat, lng, intensity] as [number, number, number];
      })
      .filter((point): point is [number, number, number] => point !== null);

    if (!heatPoints.length) {
      return;
    }

    const heatLayer = leafletWithHeat.heatLayer(heatPoints, {
      radius: 24,
      blur: 18,
      maxZoom: 17,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [heatEnabled, heatReady, map, reports]);

  return null;
}

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

export default function MapView() {
  const { getIdToken } = useAuth();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [bbox, setBbox] = useState("");

  const [status, setStatus] = useState<ReportStatus>("approved");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [severity, setSeverity] = useState<ReportSeverity | "all">("all");
  const [district, setDistrict] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");

  const [clusterEnabled, setClusterEnabled] = useState(true);
  const [heatEnabled, setHeatEnabled] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [heatReady, setHeatReady] = useState(false);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;

    import("leaflet.heat")
      .then(() => {
        if (mounted) {
          setHeatReady(true);
        }
      })
      .catch((importError) => {
        console.error("Heat layer plugin failed to load", importError);
        if (mounted) {
          setHeatReady(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const runQuery = useCallback(
    async (mode: "replace" | "append") => {
      if (!bbox) {
        return;
      }

      if (mode === "replace") {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError("");

      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }

      const controller = new AbortController();
      requestControllerRef.current = controller;

      try {
        const params = new URLSearchParams();
        params.set("status", status);
        params.set("limit", String(FETCH_LIMIT));
        params.set("bbox", bbox);

        if (category !== "all") {
          params.set("category", category);
        }

        if (severity !== "all") {
          params.set("severity", severity);
        }

        if (district.trim()) {
          params.set("district", district.trim());
        }

        if (mode === "replace") {
          const days = toDays(timeWindow);
          if (days != null) {
            const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            params.set("from", from.toISOString());
          }
        }

        if (mode === "append" && nextCursor) {
          params.set("cursor", nextCursor);
        }

        const headers: Record<string, string> = {};

        if (status !== "approved") {
          const token = await getIdToken();
          if (!token) {
            throw new Error("Session expired. Please sign in again.");
          }

          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/reports/search?${params.toString()}`, {
          signal: controller.signal,
          headers,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };

          throw new Error(payload.error ?? "Failed to load map reports");
        }

        const payload = (await response.json()) as SearchResponse;
        const normalized = (payload.reports ?? []).map((entry, index) => {
          const candidateId = entry.id;
          const id = typeof candidateId === "string" ? candidateId : `${index}`;
          return normalizeReportDoc(id, entry);
        });

        if (mode === "append") {
          setReports((previous) => {
            const byId = new Map(previous.map((item) => [item.id, item]));

            normalized.forEach((item) => {
              byId.set(item.id, item);
            });

            return Array.from(byId.values());
          });
        } else {
          setReports(normalized);
        }

        setNextCursor(payload.meta?.nextCursor ?? null);
      } catch (queryError) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Error loading GIS reports", queryError);
        setError(queryError instanceof Error ? queryError.message : "Failed to load map");
      } finally {
        if (mode === "replace") {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [bbox, category, district, getIdToken, nextCursor, severity, status, timeWindow]
  );

  useEffect(() => {
    if (!bbox) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runQuery("replace");
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [bbox, category, district, runQuery, severity, status, timeWindow]);

  useEffect(() => {
    return () => {
      if (requestControllerRef.current) {
        requestControllerRef.current.abort();
      }
    };
  }, []);

  const mappableReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report.location?.latitude != null && report.location?.longitude != null
      ),
    [reports]
  );

  const renderedReports = useMemo(
    () => mappableReports.slice(0, MAX_RENDER_MARKERS),
    [mappableReports]
  );

  const districtOptions = useMemo(() => {
    const values = new Set<string>();

    reports.forEach((report) => {
      if (report.district && report.district !== "Unassigned") {
        values.add(report.district);
      }
    });

    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [reports]);

  const exportCsv = () => {
    if (!reports.length) {
      return;
    }

    const headers = [
      "id",
      "category",
      "severity",
      "district",
      "status",
      "latitude",
      "longitude",
      "createdAt",
    ];

    const rows = reports.map((report) => [
      report.id,
      report.category,
      report.severity,
      report.district,
      report.status,
      report.location?.latitude ?? "",
      report.location?.longitude ?? "",
      report.createdAt ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    downloadText(csv, "cleannile-gis-reports.csv", "text/csv;charset=utf-8");
  };

  const exportGeoJSON = () => {
    const features = reports
      .filter((report) => report.location)
      .map((report) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            report.location?.longitude ?? 0,
            report.location?.latitude ?? 0,
          ],
        },
        properties: {
          id: report.id,
          category: report.category,
          severity: report.severity,
          district: report.district,
          status: report.status,
          description: report.description,
          createdAt: report.createdAt,
        },
      }));

    const payload = JSON.stringify(
      {
        type: "FeatureCollection",
        features,
      },
      null,
      2
    );

    downloadText(payload, "cleannile-gis-reports.geojson", "application/geo+json");
  };

  return (
    <div className="gis-workspace">
      <section className="panel gis-toolbar">
        <div className="gis-toolbar-grid">
          <label>
            <span className="muted">Status Layer</span>
            <select
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as ReportStatus)}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label>
            <span className="muted">Category</span>
            <select
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value as ReportCategory | "all")}
            >
              <option value="all">All categories</option>
              <option value="pollution">Pollution</option>
              <option value="waste">Waste</option>
              <option value="water">Water</option>
            </select>
          </label>

          <label>
            <span className="muted">Severity</span>
            <select
              className="select"
              value={severity}
              onChange={(event) => setSeverity(event.target.value as ReportSeverity | "all")}
            >
              <option value="all">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label>
            <span className="muted">District</span>
            <input
              className="input"
              type="text"
              value={district}
              list="district-options"
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="All districts"
            />
            <datalist id="district-options">
              {districtOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label>
            <span className="muted">Time Window</span>
            <select
              className="select"
              value={timeWindow}
              onChange={(event) => setTimeWindow(event.target.value as TimeWindow)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </label>
        </div>

        <div className="gis-toggle-row">
          <label className="capture-toggle-row">
            <input
              type="checkbox"
              checked={clusterEnabled}
              onChange={(event) => setClusterEnabled(event.target.checked)}
            />
            <span>Clusters</span>
          </label>

          <label className="capture-toggle-row">
            <input
              type="checkbox"
              checked={heatEnabled}
              onChange={(event) => setHeatEnabled(event.target.checked)}
            />
            <span>Heatmap</span>
          </label>

          <label className="capture-toggle-row">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(event) => setShowMarkers(event.target.checked)}
            />
            <span>Markers</span>
          </label>

          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void runQuery("replace")}>
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void runQuery("append")}
            disabled={!nextCursor || loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>

          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
            Export CSV
          </button>

          <button type="button" className="btn btn-primary btn-sm" onClick={exportGeoJSON}>
            Export GeoJSON
          </button>
        </div>

        <div className="stats-row">
          <div className="stat-tile">
            <p className="stat-label">Reports Loaded</p>
            <p className="stat-value">{reports.length}</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Mappable Features</p>
            <p className="stat-value">{mappableReports.length}</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Rendered Markers</p>
            <p className="stat-value">{renderedReports.length}</p>
          </div>
        </div>

        {error && <div className="panel">{error}</div>}
        {mappableReports.length > MAX_RENDER_MARKERS && (
          <p className="muted" style={{ margin: 0 }}>
            Marker rendering capped at {MAX_RENDER_MARKERS} points for map responsiveness.
          </p>
        )}
      </section>

      <div className="gis-map-shell">
        {loading && <div className="gis-map-overlay">Loading GIS layers...</div>}

        <MapContainer
          center={CENTER}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          preferCanvas
        >
          <TileLayer
            attribution="(c) OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ViewportWatcher
            onViewportChange={(nextBBox) => {
              setBbox((previous) => (previous === nextBBox ? previous : nextBBox));
            }}
          />

          <HeatmapLayer
            reports={renderedReports}
            heatReady={heatReady}
            heatEnabled={heatEnabled}
          />

          {showMarkers && clusterEnabled && (
            <MarkerClusterGroup chunkedLoading>
              {renderedReports.map((report) => {
                const lat = report.location?.latitude;
                const lng = report.location?.longitude;

                if (lat == null || lng == null) {
                  return null;
                }

                return (
                  <Marker key={report.id} position={[lat, lng]}>
                    <Popup>
                      <strong style={{ textTransform: "capitalize" }}>{report.category}</strong>
                      <p style={{ margin: "0.3rem 0" }}>
                        Severity: <strong>{report.severity}</strong>
                      </p>
                      <p style={{ margin: "0.3rem 0" }}>District: {report.district}</p>
                      <p>{report.description}</p>

                      {report.photoURL && (
                        <Image
                          src={report.photoURL}
                          alt="Report evidence"
                          width={220}
                          height={140}
                          className="report-photo-sm"
                          unoptimized
                        />
                      )}
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          )}

          {showMarkers && !clusterEnabled && (
            <>
              {renderedReports.map((report) => {
                const lat = report.location?.latitude;
                const lng = report.location?.longitude;

                if (lat == null || lng == null) {
                  return null;
                }

                return (
                  <Marker key={report.id} position={[lat, lng]}>
                    <Popup>
                      <strong style={{ textTransform: "capitalize" }}>{report.category}</strong>
                      <p style={{ margin: "0.3rem 0" }}>
                        Severity: <strong>{report.severity}</strong>
                      </p>
                      <p style={{ margin: "0.3rem 0" }}>District: {report.district}</p>
                      <p>{report.description}</p>

                      {report.photoURL && (
                        <Image
                          src={report.photoURL}
                          alt="Report evidence"
                          width={220}
                          height={140}
                          className="report-photo-sm"
                          unoptimized
                        />
                      )}
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}







