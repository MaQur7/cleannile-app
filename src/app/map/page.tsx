"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { GoogleMap,  Marker,  InfoWindow,  HeatmapLayer,  useLoadScript,} from "@react-google-maps/api";
import { useRouter } from "next/navigation";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

export default function MapPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const router = useRouter();
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (!user) {
      router.push("/login");
    }
  });

  return () => unsubscribe();
}, [router]);  

const { isLoaded } = useLoadScript({
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  libraries: ["visualization"],
});

  useEffect(() => {
    const fetchReports = async () => {
      const snapshot = await getDocs(collection(db, "reports"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
    };

    fetchReports();
  }, []);

  if (!isLoaded) return <div>Loading map...</div>;

return (
  <div>
    <button
      onClick={() => setShowHeatmap(!showHeatmap)}
      style={{ marginBottom: "10px" }}
    >
      {showHeatmap ? "Show Markers" : "Show Heatmap"}
    </button>

    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: 4.8594, lng: 31.5713 }} // Juba example
      zoom={12}
    >
      {showHeatmap && reports.length > 0 && (
  <HeatmapLayer
    data={reports.map(
      (report) =>
        new window.google.maps.LatLng(
          report.location.latitude,
          report.location.longitude
        )
    )}
  />
)}
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={{
            lat: report.location.latitude,
            lng: report.location.longitude,
          }}
          onClick={() => setSelected(report)}
        />
      ))}
      
      {selected && (
        <InfoWindow
  position={{
    lat: selected.location.latitude,
    lng: selected.location.longitude,
  }}
  onCloseClick={() => setSelected(null)}
>
  <div style={{ maxWidth: "250px" }}>
    <h4>{selected.category}</h4>
    <p>{selected.description}</p>
    <img
      src={selected.photoURL}
      alt="Report"
      style={{
        width: "100%",
        height: "150px",
        objectFit: "cover",
        borderRadius: "8px",
      }}
    />
  </div>
</InfoWindow>

      )}
    </GoogleMap>
  </div>
  );
}