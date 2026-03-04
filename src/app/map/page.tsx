"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const center: [number, number] = [4.8594, 31.5713]; // Juba

export default function MapPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      const snapshot = await getDocs(collection(db, "reports"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReports(data);
    };

    fetchReports();
  }, []);

  const heatPoints = reports.map((report) => [
    report.location.latitude,
    report.location.longitude,
    0.6,
  ]);

  useEffect(() => {
    if (!map || !showHeatmap) return;

    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, showHeatmap, reports]);

  return (
    <div>
      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 10,
          left: 10,
        }}
      >
        {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
      </button>

      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100vh", width: "100%" }}
        ref={setMap}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[
              report.location.latitude,
              report.location.longitude,
            ]}
          >
            <Popup>
              <strong>{report.category}</strong>
              <p>{report.description}</p>

              <img
                src={report.photoURL}
                style={{
                  width: "200px",
                  borderRadius: "8px",
                }}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}