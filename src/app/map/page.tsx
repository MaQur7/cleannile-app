"use client";

import dynamic from "next/dynamic";
import AdminGuard from "../../components/AdminGuard";
import PageLoader from "../../components/ui/PageLoader";

const MapView = dynamic(() => import("../../components/MapView"), {
  ssr: false,
  loading: () => (
    <PageLoader
      title="Loading GIS workspace"
      description="Preparing layers, tiles, and geospatial analytics controls."
    />
  ),
});

export default function MapPage() {
  return (
    <AdminGuard>
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Environmental GIS Workspace</h1>
            <p className="page-subtitle">
              Layered geospatial analysis for verified incidents, hotspots, and temporal trends.
            </p>
          </div>
        </header>

        <div className="panel" style={{ padding: "0.6rem" }}>
          <MapView />
        </div>
      </section>
    </AdminGuard>
  );
}
