/**
 * GIS Export Utilities
 * Support for exporting spatial data in various formats for integration with
 * external GIS systems and analysis tools
 */

import { ReportRecord } from "./schemas";
import { PollutionHotspot } from "./environmental-analytics";

/**
 * Export reports as GeoJSON FeatureCollection
 */
export function reportsToGeoJSON(reports: ReportRecord[]) {
  const features = reports
    .filter((r) => r.location)
    .map((report) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [report.location!.longitude, report.location!.latitude],
      },
      properties: {
        id: report.id,
        category: report.category,
        severity: report.severity,
        status: report.status,
        district: report.district,
        description: report.description,
        photoURL: report.photoURL,
        createdAt: report.createdAt,
        color: getSeverityColor(report.severity),
      },
    }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Export hotspots as GeoJSON with heatmap points
 */
export function hotspotsToGeoJSON(hotspots: PollutionHotspot[]) {
  const features = hotspots.map((hotspot) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [hotspot.longitude, hotspot.latitude],
    },
    properties: {
      id: hotspot.id,
      reportCount: hotspot.reportCount,
      avgSeverity: hotspot.avgSeverity,
      riskLevel: hotspot.riskLevel,
      district: hotspot.district,
      latestReport: hotspot.latestReport,
      categories: hotspot.categories,
      color: getRiskLevelColor(hotspot.riskLevel),
      radius: Math.ceil(Math.log(hotspot.reportCount + 1) * 100),
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Export reports as CSV
 */
export function reportsToCSV(reports: ReportRecord[]): string {
  const headers = [
    "ID",
    "Category",
    "Severity",
    "Status",
    "District",
    "Latitude",
    "Longitude",
    "Description",
    "Created Date",
    "User ID",
  ];

  const rows = reports.map((r) => [
    r.id,
    r.category,
    r.severity,
    r.status,
    r.district,
    r.location?.latitude ?? "",
    r.location?.longitude ?? "",
    `"${r.description.replace(/"/g, '""')}"`,
    r.createdAt,
    r.userId,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Export reports as KML (for Google Earth)
 */
export function reportsToKML(reports: ReportRecord[]): string {
  const placemarks = reports
    .filter((r) => r.location)
    .map((report) => {
      const iconUrl = getSeverityIconUrl(report.severity);
      return `
    <Placemark>
      <name>${escapeXML(report.category)}</name>
      <description>${escapeXML(report.description)}</description>
      <Style>
        <IconStyle>
          <Icon>
            <href>${iconUrl}</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${report.location!.longitude},${report.location!.latitude},0</coordinates>
      </Point>
    </Placemark>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Environmental Reports</name>
    ${placemarks}
  </Document>
</kml>`;
}

/**
 * Export as GeoJSON with heatmap intensity
 */
export function reportsToHeatmapGeoJSON(
  reports: ReportRecord[],
  radiusKm: number = 1
) {
  interface HeatmapPoint {
    latitude: number;
    longitude: number;
    intensity: number;
  }

  const gridSize = radiusKm / 111; // Convert km to degrees (approximate)
  const gridMap = new Map<string, HeatmapPoint>();

  // Aggregate reports into grid cells
  for (const report of reports) {
    if (!report.location) continue;

    const gridKey = `${Math.floor(report.location.latitude / gridSize)}_${Math.floor(report.location.longitude / gridSize)}`;
    const existing = gridMap.get(gridKey);
    const severity = getSeverityValue(report.severity);

    if (existing) {
      existing.intensity = Math.max(existing.intensity, severity);
    } else {
      gridMap.set(gridKey, {
        latitude:
          (Math.floor(report.location.latitude / gridSize) + 0.5) * gridSize,
        longitude:
          (Math.floor(report.location.longitude / gridSize) + 0.5) * gridSize,
        intensity: severity,
      });
    }
  }

  const features = Array.from(gridMap.values()).map((point) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude],
    },
    properties: {
      intensity: point.intensity,
      color: getIntensityColor(point.intensity),
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Download data as file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper function to get severity color
 */
function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef5350",
    critical: "#dc2626",
  };
  return colors[severity] || "#999";
}

/**
 * Helper function to get risk level color
 */
function getRiskLevelColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef5350",
    critical: "#dc2626",
  };
  return colors[riskLevel] || "#999";
}

/**
 * Helper function to get severity numeric value
 */
function getSeverityValue(severity: string): number {
  const values: Record<string, number> = {
    low: 0.25,
    medium: 0.5,
    high: 0.75,
    critical: 1.0,
  };
  return values[severity] || 0.5;
}

/**
 * Helper function to get intensity color
 */
function getIntensityColor(intensity: number): string {
  if (intensity >= 0.9) return "#dc2626"; // red
  if (intensity >= 0.7) return "#f97316"; // orange
  if (intensity >= 0.5) return "#fbbf24"; // yellow
  if (intensity >= 0.3) return "#10b981"; // green
  return "#3b82f6"; // blue
}

/**
 * Helper function to get severity icon URL
 */
function getSeverityIconUrl(severity: string): string {
  const baseUrl = "https://maps.google.com/mapfiles/ms/icons";
  const colors: Record<string, string> = {
    low: "green",
    medium: "yellow",
    high: "orange",
    critical: "red",
  };
  const color = colors[severity] || "gray";
  return `${baseUrl}/${color}-dot.png`;
}

/**
 * Helper function to escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
