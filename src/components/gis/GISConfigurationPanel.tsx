"use client";

import { useState } from "react";
import {
  DEFAULT_GIS_LAYER_CONFIGS,
  DEFAULT_HEATMAP_CONFIG,
  DEFAULT_CLUSTER_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG,
  type GISLayerConfig,
  type GISLayerType,
  type HeatmapConfig,
  type ClusterConfig,
  type PerformanceConfig,
} from "../../lib/gis-layers";

interface ConfigPanelProps {
  onClose?: () => void;
}

/**
 * GIS Configuration Management Panel
 * Allows administrators to configure GIS layers, visualization, and performance
 */
export default function GISConfigurationPanel({ onClose }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<"layers" | "heatmap" | "clustering" | "performance">(
    "layers"
  );
  const [layerConfigs, setLayerConfigs] = useState(DEFAULT_GIS_LAYER_CONFIGS);
  const [heatmapConfig, setHeatmapConfig] = useState(DEFAULT_HEATMAP_CONFIG);
  const [clusterConfig, setClusterConfig] = useState(DEFAULT_CLUSTER_CONFIG);
  const [performanceConfig, setPerformanceConfig] = useState(DEFAULT_PERFORMANCE_CONFIG);
  const [saved, setSaved] = useState(false);

  const handleSaveConfig = () => {
    localStorage.setItem("gis-layer-configs", JSON.stringify(layerConfigs));
    localStorage.setItem("gis-heatmap-config", JSON.stringify(heatmapConfig));
    localStorage.setItem("gis-cluster-config", JSON.stringify(clusterConfig));
    localStorage.setItem("gis-performance-config", JSON.stringify(performanceConfig));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetConfig = () => {
    setLayerConfigs(DEFAULT_GIS_LAYER_CONFIGS);
    setHeatmapConfig(DEFAULT_HEATMAP_CONFIG);
    setClusterConfig(DEFAULT_CLUSTER_CONFIG);
    setPerformanceConfig(DEFAULT_PERFORMANCE_CONFIG);
    localStorage.removeItem("gis-layer-configs");
    localStorage.removeItem("gis-heatmap-config");
    localStorage.removeItem("gis-cluster-config");
    localStorage.removeItem("gis-performance-config");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={() => onClose?.()}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 25px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "white",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px" }}>GIS Configuration</h2>
          <button
            onClick={() => onClose?.()}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          {["layers", "heatmap", "clustering", "performance"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: activeTab === tab ? "white" : "transparent",
                borderBottom: activeTab === tab ? "3px solid #118ab2" : "none",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "600" : "normal",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "20px" }}>
          {activeTab === "layers" && (
            <LayersConfig configs={layerConfigs} onChange={setLayerConfigs} />
          )}
          {activeTab === "heatmap" && (
            <HeatmapConfigPanel config={heatmapConfig} onChange={setHeatmapConfig} />
          )}
          {activeTab === "clustering" && (
            <ClusteringConfig config={clusterConfig} onChange={setClusterConfig} />
          )}
          {activeTab === "performance" && (
            <PerformanceConfig config={performanceConfig} onChange={setPerformanceConfig} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          {saved && <span style={{ color: "#10b981", fontWeight: "600" }}>✓ Saved</span>}
          <button
            onClick={handleResetConfig}
            style={{
              padding: "8px 16px",
              background: "#e5e7eb",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveConfig}
            style={{
              padding: "8px 16px",
              background: "#118ab2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Layer Configuration Component
 */
function LayersConfig({
  configs,
  onChange,
}: {
  configs: Record<GISLayerType, GISLayerConfig>;
  onChange: (configs: Record<GISLayerType, GISLayerConfig>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {Object.entries(configs).map(([layerId, config]) => (
        <div
          key={layerId}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", gap: "12px" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                background: config.color,
              }}
            />
            <h3 style={{ margin: 0, flex: 1, fontSize: "14px", fontWeight: "600" }}>
              {config.label}
            </h3>
            <input
              type="checkbox"
              checked={config.visible}
              onChange={(e) =>
                onChange({
                  ...configs,
                  [layerId]: { ...config, visible: e.target.checked },
                })
              }
              style={{ cursor: "pointer" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
            <label>
              <div style={{ marginBottom: "4px", fontWeight: "600" }}>Opacity</div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(config.opacity * 100)}
                onChange={(e) =>
                  onChange({
                    ...configs,
                    [layerId]: { ...config, opacity: parseInt(e.target.value) / 100 },
                  })
                }
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: "12px", color: "#666" }}>
                {Math.round(config.opacity * 100)}%
              </div>
            </label>

            <label>
              <div style={{ marginBottom: "4px", fontWeight: "600" }}>Z-Index</div>
              <input
                type="number"
                min={0}
                max={1000}
                value={config.zIndex}
                onChange={(e) =>
                  onChange({
                    ...configs,
                    [layerId]: { ...config, zIndex: parseInt(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "4px" }}
              />
            </label>

            <label>
              <div style={{ marginBottom: "4px", fontWeight: "600" }}>Min Zoom</div>
              <input
                type="number"
                min={0}
                max={18}
                value={config.minZoom}
                onChange={(e) =>
                  onChange({
                    ...configs,
                    [layerId]: { ...config, minZoom: parseInt(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "4px" }}
              />
            </label>

            <label>
              <div style={{ marginBottom: "4px", fontWeight: "600" }}>Max Zoom</div>
              <input
                type="number"
                min={0}
                max={18}
                value={config.maxZoom}
                onChange={(e) =>
                  onChange({
                    ...configs,
                    [layerId]: { ...config, maxZoom: parseInt(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "4px" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px", fontSize: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.clusterEnabled}
                onChange={(e) =>
                  onChange({
                    ...configs,
                    [layerId]: { ...config, clusterEnabled: e.target.checked },
                  })
                }
              />
              Clustering
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.heatmapEnabled}
                onChange={(e) =>
                  onChange({
                    ...configs,
                    [layerId]: { ...config, heatmapEnabled: e.target.checked },
                  })
                }
              />
              Heatmap
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Heatmap Configuration Component
 */
function HeatmapConfigPanel({
  config,
  onChange,
}: {
  config: HeatmapConfig;
  onChange: (config: HeatmapConfig) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Radius</div>
          <input
            type="range"
            min={10}
            max={100}
            value={config.radius}
            onChange={(e) => onChange({ ...config, radius: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>{config.radius}px</div>
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Blur</div>
          <input
            type="range"
            min={5}
            max={50}
            value={config.blur}
            onChange={(e) => onChange({ ...config, blur: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>{config.blur}px</div>
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Max Zoom</div>
          <input
            type="number"
            min={1}
            max={18}
            value={config.maxZoom}
            onChange={(e) => onChange({ ...config, maxZoom: parseInt(e.target.value) })}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Min Opacity</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.minOpacity * 100)}
            onChange={(e) => onChange({ ...config, minOpacity: parseInt(e.target.value) / 100 })}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>
            {Math.round(config.minOpacity * 100)}%
          </div>
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Max Opacity</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.maxOpacity * 100)}
            onChange={(e) => onChange({ ...config, maxOpacity: parseInt(e.target.value) / 100 })}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>
            {Math.round(config.maxOpacity * 100)}%
          </div>
        </label>
      </div>
    </div>
  );
}

/**
 * Clustering Configuration Component
 */
function ClusteringConfig({
  config,
  onChange,
}: {
  config: ClusterConfig;
  onChange: (config: ClusterConfig) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
        />
        <span style={{ fontWeight: "600" }}>Enable Clustering</span>
      </label>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Max Zoom</div>
          <input
            type="number"
            min={1}
            max={18}
            value={config.maxZoom}
            onChange={(e) => onChange({ ...config, maxZoom: parseInt(e.target.value) })}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Cluster Radius</div>
          <input
            type="range"
            min={20}
            max={200}
            value={config.radius}
            onChange={(e) => onChange({ ...config, radius: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>{config.radius}px</div>
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Cluster Color</div>
          <input
            type="color"
            value={config.clusterBgColor}
            onChange={(e) => onChange({ ...config, clusterBgColor: e.target.value })}
            style={{ padding: "4px", cursor: "pointer" }}
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Performance Configuration Component
 */
function PerformanceConfig({
  config,
  onChange,
}: {
  config: PerformanceConfig;
  onChange: (config: PerformanceConfig) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Max Rendered Features</div>
          <input
            type="number"
            min={100}
            max={5000}
            value={config.maxRenderedFeatures}
            onChange={(e) =>
              onChange({ ...config, maxRenderedFeatures: parseInt(e.target.value) })
            }
            style={{ width: "100%", padding: "8px" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>
            Maximum features rendered on map at once
          </div>
        </label>
      </div>

      <div>
        <label>
          <div style={{ marginBottom: "8px", fontWeight: "600" }}>Lazy Load Threshold</div>
          <input
            type="number"
            min={50}
            max={1000}
            value={config.lazyLoadThreshold}
            onChange={(e) =>
              onChange({ ...config, lazyLoadThreshold: parseInt(e.target.value) })
            }
            style={{ width: "100%", padding: "8px" }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>
            Load more data when fewer than this many features remain
          </div>
        </label>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={config.serverSideFiltering}
          onChange={(e) =>
            onChange({ ...config, serverSideFiltering: e.target.checked })
          }
        />
        <span style={{ fontWeight: "600" }}>Server-Side Filtering</span>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={config.vectorTileAggregation}
          onChange={(e) =>
            onChange({ ...config, vectorTileAggregation: e.target.checked })
          }
        />
        <span style={{ fontWeight: "600" }}>Vector Tile Aggregation</span>
      </label>
    </div>
  );
}
