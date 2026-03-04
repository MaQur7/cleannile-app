"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const center: [number, number] = [4.8594, 31.5713];

export default function MapView() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const snapshot = await getDocs(collection(db, "reports"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Reports from Firestore:", data);

      setReports(data);
    };

    fetchReports();
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {reports.map((report) => {
        const lat =
          report.latitude ??
          report.location?.latitude ??
          report.location?._lat;

        const lng =
          report.longitude ??
          report.location?.longitude ??
          report.location?._long;

        if (!lat || !lng) return null;

        return (
          <Marker key={report.id} position={[lat, lng]}>
            <Popup>
              <strong>{report.category}</strong>
              <p>{report.description}</p>

              {report.photoURL && (
                <img
                  src={report.photoURL}
                  alt="Pollution Report"
                  style={{
                    width: "200px",
                    borderRadius: "8px",
                  }}
                />
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}