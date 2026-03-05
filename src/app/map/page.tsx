"use client";

import dynamic from "next/dynamic";
import AdminGuard from "../../components/AdminGuard";

const MapView = dynamic(
() => import("../../components/MapView"),
{ ssr: false }
);

export default function MapPage() {
return ( <AdminGuard> <MapView /> </AdminGuard>
);
}
