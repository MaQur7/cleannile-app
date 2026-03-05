"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

const center:[number,number] = [4.8594,31.5713];

function HeatmapLayer({reports}:any){

const map = useMap();

useEffect(()=>{

if(!reports.length) return;

const heatPoints = reports.map((report:any)=>{

const lat = report.location?.latitude ?? report.latitude;
const lng = report.location?.longitude ?? report.longitude;

if(!lat || !lng) return null;

return [lat,lng,0.5];

}).filter(Boolean);

const heatLayer = (L as any).heatLayer(heatPoints,{
radius:25,
blur:20,
maxZoom:17
});

heatLayer.addTo(map);

return ()=>{
map.removeLayer(heatLayer);
};

},[reports,map]);

return null;

}

export default function MapView(){

const [reports,setReports] = useState<any[]>([]);

useEffect(()=>{

const fetchReports = async()=>{

const snapshot = await getDocs(collection(db,"reports"));

const data = snapshot.docs.map(doc=>({
id:doc.id,
...doc.data(),
}));

setReports(data);

};

fetchReports();

},[]);

return(

<MapContainer
center={center}
zoom={12}
style={{height:"100vh",width:"100%"}}

>

<TileLayer
attribution="© OpenStreetMap contributors"
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

<HeatmapLayer reports={reports}/>

{reports.map((report)=>{

const lat = report.location?.latitude ?? report.latitude;
const lng = report.location?.longitude ?? report.longitude;

if(!lat || !lng) return null;

return(

<Marker key={report.id} position={[lat,lng]}>

<Popup>

<strong>{report.category}</strong>

<p>{report.description}</p>

<img
src={report.photoURL}
style={{
width:"200px",
borderRadius:"8px"
}}
/>

</Popup>

</Marker>

);

})}

</MapContainer>

);

}
