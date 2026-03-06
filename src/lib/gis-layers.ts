/**
 * GIS Layer System
 * Manages multiple environmental data layers with unified visualization
 * and filtering capabilities across the platform.
 */

import { ReportCategory, ReportSeverity, ReportStatus } from "./schemas";

/**
 * Layer types supported by the GIS system
 */
export const GIS_LAYER_TYPES = [
  "pollution-reports",
  "plastic-hotspots",
  "cleanup-events",
  "volunteer-activity",
  "satellite-imagery",
] as const;

export type GISLayerType = (typeof GIS_LAYER_TYPES)[number];

/**
 * Layer visibility and styling configuration
 */
export interface GISLayerConfig {
  id: GISLayerType;
  label: string;
  description: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  color: string;
  secondaryColor?: string;
  categories?: ReportCategory[];
  minZoom: number;
  maxZoom: number;
  clusterEnabled: boolean;
  heatmapEnabled: boolean;
}

/**
 * Geographic feature with temporal data
 */
export interface GISFeature {
  id: string;
  type: GISLayerType;
  latitude: number;
  longitude: number;
  timestamp: number;
  intensity?: number; // 0-1 for heatmap intensity
  category?: ReportCategory;
  severity?: ReportSeverity;
  status?: ReportStatus;
  data: Record<string, unknown>;
}

/**
 * Temporal analysis configuration
 */
export interface TemporalFilter {
  enabled: boolean;
  startDate: Date;
  endDate: Date;
  granularity: "day" | "week" | "month";
}

/**
 * Clustering configuration for efficient rendering
 */
export interface ClusterConfig {
  enabled: boolean;
  maxZoom: number;
  radius: number;
  clusterColor: string;
  clusterBgColor: string;
  clusterTextColor: string;
}

/**
 * Heatmap configuration
 */
export interface HeatmapConfig {
  enabled: boolean;
  radius: number;
  blur: number;
  maxZoom: number;
  minOpacity: number;
  maxOpacity: number;
  gradient?: {
    [offset: number]: string;
  };
  intensityField: "severity" | "count" | "custom";
}

/**
 * Performance optimization settings
 */
export interface PerformanceConfig {
  maxRenderedFeatures: number;
  lazyLoadThreshold: number;
  serverSideFiltering: boolean;
  vectorTileAggregation: boolean;
}

/**
 * Default GIS layer configurations
 */
export const DEFAULT_GIS_LAYER_CONFIGS: Record<GISLayerType, GISLayerConfig> = {
  "pollution-reports": {
    id: "pollution-reports",
    label: "Pollution Reports",
    description: "User-reported pollution incidents with severity levels",
    visible: true,
    opacity: 0.85,
    zIndex: 100,
    color: "#ef4444",
    secondaryColor: "#fca5a5",
    categories: ["pollution", "waste", "water"],
    minZoom: 0,
    maxZoom: 18,
    clusterEnabled: true,
    heatmapEnabled: true,
  },
  "plastic-hotspots": {
    id: "plastic-hotspots",
    label: "Plastic Hotspots",
    description: "Areas with high concentration of plastic pollution",
    visible: true,
    opacity: 0.8,
    zIndex: 90,
    color: "#ec4899",
    secondaryColor: "#fbcfe8",
    categories: ["waste"],
    minZoom: 0,
    maxZoom: 18,
    clusterEnabled: true,
    heatmapEnabled: true,
  },
  "cleanup-events": {
    id: "cleanup-events",
    label: "Cleanup Events",
    description: "Community cleanup events and environmental initiatives",
    visible: true,
    opacity: 0.75,
    zIndex: 80,
    color: "#22c55e",
    secondaryColor: "#bbf7d0",
    minZoom: 0,
    maxZoom: 18,
    clusterEnabled: true,
    heatmapEnabled: false,
  },
  "volunteer-activity": {
    id: "volunteer-activity",
    label: "Volunteer Activity",
    description: "Volunteer participation and community engagement",
    visible: true,
    opacity: 0.7,
    zIndex: 70,
    color: "#3b82f6",
    secondaryColor: "#bfdbfe",
    minZoom: 0,
    maxZoom: 18,
    clusterEnabled: true,
    heatmapEnabled: false,
  },
  "satellite-imagery": {
    id: "satellite-imagery",
    label: "Satellite Imagery",
    description: "Satellite imagery for environmental monitoring",
    visible: false,
    opacity: 0.6,
    zIndex: 10,
    color: "#a78bfa",
    minZoom: 0,
    maxZoom: 18,
    clusterEnabled: false,
    heatmapEnabled: false,
  },
};

/**
 * Default heatmap configuration
 */
export const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  enabled: true,
  radius: 24,
  blur: 18,
  maxZoom: 17,
  minOpacity: 0.2,
  maxOpacity: 0.95,
  gradient: {
    0.0: "#3b82f6", // blue
    0.25: "#10b981", // green
    0.5: "#fbbf24", // yellow
    0.75: "#f97316", // orange
    1.0: "#dc2626", // red
  },
  intensityField: "severity",
};

/**
 * Default clustering configuration
 */
export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  enabled: true,
  maxZoom: 14,
  radius: 50,
  clusterColor: "#fff",
  clusterBgColor: "#118ab2",
  clusterTextColor: "#fff",
};

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxRenderedFeatures: 2000,
  lazyLoadThreshold: 200,
  serverSideFiltering: true,
  vectorTileAggregation: false,
};

/**
 * Calculate intensity for a feature based on severity and count
 */
export function calculateIntensity(
  severity?: ReportSeverity,
  count: number = 1,
  multiplyByCount: boolean = false
): number {
  let baseIntensity = 0.5;

  if (severity === "critical") {
    baseIntensity = 0.95;
  } else if (severity === "high") {
    baseIntensity = 0.8;
  } else if (severity === "medium") {
    baseIntensity = 0.65;
  } else if (severity === "low") {
    baseIntensity = 0.4;
  }

  if (multiplyByCount) {
    return Math.min(0.95, baseIntensity * Math.log(count + 1) / 5);
  }

  return baseIntensity;
}

/**
 * Validate layer configuration
 */
export function validateLayerConfig(config: GISLayerConfig): boolean {
  return (
    config.opacity >= 0 &&
    config.opacity <= 1 &&
    config.zIndex >= 0 &&
    config.zIndex <= 1000 &&
    config.minZoom >= 0 &&
    config.maxZoom <= 18 &&
    config.minZoom <= config.maxZoom
  );
}

/**
 * Calculate bounding box from array of features
 */
export function calculateBoundingBox(
  features: GISFeature[]
): { north: number; south: number; east: number; west: number } | null {
  if (features.length === 0) {
    return null;
  }

  let north = features[0].latitude;
  let south = features[0].latitude;
  let east = features[0].longitude;
  let west = features[0].longitude;

  for (const feature of features) {
    north = Math.max(north, feature.latitude);
    south = Math.min(south, feature.latitude);
    east = Math.max(east, feature.longitude);
    west = Math.min(west, feature.longitude);
  }

  return { north, south, east, west };
}
