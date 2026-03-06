"use client";

export default function HeatmapLegend() {
  return (
    <div style={{
      position: "absolute",
      bottom: "20px",
      right: "20px",
      background: "white",
      padding: "12px 16px",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      fontSize: "12px",
      zIndex: 400,
    }}>
      <div style={{ marginBottom: "8px", fontWeight: "600" }}>Pollution Intensity</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ 
          width: "20px", 
          height: "20px", 
          background: "#3b82f6", 
          borderRadius: "3px" 
        }} />
        <span>Low</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ 
          width: "20px", 
          height: "20px", 
          background: "#10b981", 
          borderRadius: "3px" 
        }} />
        <span>Moderate</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ 
          width: "20px", 
          height: "20px", 
          background: "#fbbf24", 
          borderRadius: "3px" 
        }} />
        <span>High</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ 
          width: "20px", 
          height: "20px", 
          background: "#f97316", 
          borderRadius: "3px" 
        }} />
        <span>Very High</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ 
          width: "20px", 
          height: "20px", 
          background: "#dc2626", 
          borderRadius: "3px" 
        }} />
        <span>Critical</span>
      </div>
    </div>
  );
}
