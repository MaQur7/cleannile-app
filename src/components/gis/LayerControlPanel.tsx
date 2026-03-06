"use client";

import { GIS_LAYER_TYPES, type GISLayerType, type GISLayerConfig } from "../../lib/gis-layers";

interface LayerControlPanelProps {
  layerConfigs: Record<GISLayerType, GISLayerConfig>;
  onLayerChange: (layerType: GISLayerType, config: GISLayerConfig) => void;
}

export default function LayerControlPanel({
  layerConfigs,
  onLayerChange,
}: LayerControlPanelProps) {
  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "20px",
      background: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      zIndex: 400,
      minWidth: "280px",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #e5e7eb",
        fontWeight: "600",
        fontSize: "14px",
      }}>
        GIS Layers
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {GIS_LAYER_TYPES.map((layerType) => {
          const config = layerConfigs[layerType];
          return (
            <div key={layerType}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                marginBottom: "6px",
              }}>
                <input
                  type="checkbox"
                  checked={config.visible}
                  onChange={(e) =>
                    onLayerChange(layerType, { ...config, visible: e.target.checked })
                  }
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontWeight: "500", fontSize: "13px" }}>{config.label}</span>
              </label>

              {config.visible && (
                <div style={{ fontSize: "12px", color: "#666", marginLeft: "24px" }}>
                  <div style={{ marginBottom: "4px" }}>
                    <label style={{ display: "block", marginBottom: "4px" }}>
                      Opacity: {Math.round(config.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(config.opacity * 100)}
                      onChange={(e) =>
                        onLayerChange(layerType, {
                          ...config,
                          opacity: parseInt(e.target.value, 10) / 100,
                        })
                      }
                      style={{ width: "100%", cursor: "pointer" }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
