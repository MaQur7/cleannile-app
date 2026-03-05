"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import {
BarChart,
Bar,
XAxis,
YAxis,
Tooltip as RechartsTooltip,
ResponsiveContainer,
PieChart,
Pie,
Cell,
LineChart,
Line,
CartesianGrid
} from "recharts";

export default function AdminStats() {

const [reports,setReports] = useState<any[]>([]);
const [events,setEvents] = useState<any[]>([]);

useEffect(()=>{

const loadData = async()=>{

const reportsSnap = await getDocs(collection(db,"reports"));
const eventsSnap = await getDocs(collection(db,"events"));

setReports(reportsSnap.docs.map(doc=>doc.data()));
setEvents(eventsSnap.docs.map(doc=>doc.data()));

};

loadData();

},[]);

const totalReports = reports.length;

const categoryCounts:any = {};

reports.forEach((r)=>{
categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
});

const categoryData = Object.entries(categoryCounts).map(
([key, value]) => ({
name: key,
value: value
})
);

const approved = reports.filter(r=>r.status==="approved").length;
const rejected = reports.filter(r=>r.status==="rejected").length;
const pending = reports.filter(r=>r.status==="pending").length;

const statusData = [
{name:"Approved",value:approved},
{name:"Rejected",value:rejected},
{name:"Pending",value:pending}
];

const monthlyCounts:any = {};

reports.forEach((r:any) => {

let date;

if (r.createdAt?.seconds) {
date = new Date(r.createdAt.seconds * 1000);
} else {
date = new Date();
}

const month = date.toLocaleString("default",{ month:"short" });

monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

});

const monthlyData = Object.entries(monthlyCounts).map(
([month,count]) => ({
month,
reports: count
})
);

const totalVolunteers = events.reduce((sum,e)=>{
return sum + (e.volunteers ? e.volunteers.length : 0);
},0);

const COLORS = ["#28a745","#dc3545","#ffc107"];

const exportReportsCSV = () => {

if(!reports.length){
alert("No reports available.");
return;
}

const headers = [
"id",
"category",
"description",
"status",
"latitude",
"longitude",
"userId"
];

const rows = reports.map((r:any)=>[
r.id ?? "",
r.category ?? "",
r.description ?? "",
r.status ?? "",
r.location?.latitude ?? "",
r.location?.longitude ?? "",
r.userId ?? ""
]);

const csvContent =
[headers,...rows]
.map(row=>row.join(","))
.join("\n");

const blob = new Blob([csvContent],{type:"text/csv"});
const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.href = url;
link.download = "cleannile_reports_summary.csv";

document.body.appendChild(link);
link.click();
document.body.removeChild(link);

};

const exportEventsCSV = () => {

if(!events.length){
alert("No events available.");
return;
}

const headers = [
"id",
"title",
"description",
"date",
"volunteerCount"
];

const rows = events.map((e:any)=>[
e.id ?? "",
e.title ?? "",
e.description ?? "",
e.date ?? "",
e.volunteers ? e.volunteers.length : 0
]);

const csvContent =
[headers,...rows]
.map(row=>row.join(","))
.join("\n");

const blob = new Blob([csvContent],{type:"text/csv"});
const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.href = url;
link.download = "cleannile_events_summary.csv";

document.body.appendChild(link);
link.click();
document.body.removeChild(link);

};

return(

<div style={{marginTop:"40px"}}>

<h2>Environmental Impact Statistics</h2>

<div style={{marginTop:"20px"}}>

<p><strong>Total Reports:</strong> {totalReports}</p>
<p><strong>Total Cleanup Volunteers:</strong> {totalVolunteers}</p>

</div>

<h3 style={{marginTop:"30px"}}>Pollution by Category</h3>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={categoryData}>

<XAxis dataKey="name"/>
<YAxis/>
<RechartsTooltip/>

<div style={{marginTop:"20px",marginBottom:"20px",display:"flex",gap:"10px"}}>

<button
onClick={exportReportsCSV}
style={{
padding:"10px 14px",
background:"#2c7be5",
color:"#fff",
border:"none",
borderRadius:"6px",
cursor:"pointer"
}}

>

Download Reports Summary </button>

<button
onClick={exportEventsCSV}
style={{
padding:"10px 14px",
background:"#28a745",
color:"#fff",
border:"none",
borderRadius:"6px",
cursor:"pointer"
}}

>

Download Events Summary </button>

</div>

<Bar dataKey="value" fill="#2c7be5"/>

</BarChart>

</ResponsiveContainer>

<h3 style={{marginTop:"40px"}}>Report Status</h3>

<ResponsiveContainer width="100%" height={300}>

<PieChart>

<Pie
data={statusData}
dataKey="value"
nameKey="name"
outerRadius={120}
label

>

{statusData.map((entry,index)=>(
<Cell key={index} fill={COLORS[index % COLORS.length]} />
))}

</Pie>

<RechartsTooltip/>

</PieChart>

</ResponsiveContainer>

</div>

);

}
