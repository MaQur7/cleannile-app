"use client";

import { TemporalDataPoint, formatTemporalDate, type TemporalGranularity } from "../../lib/temporal-analysis";

interface TemporalSliderProps {
  dataPoints: TemporalDataPoint[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  granularity: TemporalGranularity;
}

export default function TemporalSlider({
  dataPoints,
  selectedIndex,
  onSelect,
  granularity,
}: TemporalSliderProps) {
  if (dataPoints.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      background: "#f0f9ff", 
      padding: "12px 16px", 
      borderBottom: "1px solid #cbd5e1",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}>
          Temporal Analysis:
        </label>
        
        <input
          type="range"
          min={0}
          max={dataPoints.length - 1}
          value={selectedIndex ?? 0}
          onChange={(e) => onSelect(parseInt(e.target.value, 10))}
          style={{ flex: 1 }}
        />

        <div style={{ fontSize: "13px", minWidth: "150px", textAlign: "right" }}>
          {selectedIndex !== null && dataPoints[selectedIndex] && (
            <div>
              <strong>{formatTemporalDate(dataPoints[selectedIndex].date, granularity)}</strong>
              <br />
              <span style={{ color: "#666", fontSize: "12px" }}>
                {dataPoints[selectedIndex].count} reports
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mini chart showing temporal distribution */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "40px" }}>
        {dataPoints.map((point, idx) => {
          const maxCount = Math.max(...dataPoints.map((p) => p.count)) || 1;
          const heightPercent = (point.count / maxCount) * 100;
          const isSelected = idx === selectedIndex;

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                backgroundColor: isSelected ? "#3b82f6" : "#cbd5e1",
                cursor: "pointer",
                borderRadius: "2px",
                transition: "all 0.2s",
                opacity: isSelected ? 1 : 0.6,
              }}
              onClick={() => onSelect(idx)}
              title={`${point.count} reports on ${formatTemporalDate(point.date, granularity)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
