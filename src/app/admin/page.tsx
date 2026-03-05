"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import {
doc,
getDoc,
collection,
updateDoc,
} from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";

import AdminGuard from "../../components/AdminGuard";
import AdminStats from "../../components/AdminStats";

export default function AdminPage() {

const router = useRouter();

const [loading, setLoading] = useState(true);
const [reports, setReports] = useState<any[]>([]);
const [message, setMessage] = useState("");

// 🔐 Check if user is admin safely
useEffect(() => {

const unsubscribe = auth.onAuthStateChanged(async (user) => {

if (!user) {
router.push("/login");
return;
}

try {

const userDoc = await getDoc(doc(db, "users", user.uid));

if (!userDoc.exists() || userDoc.data().role !== "admin") {
router.push("/dashboard");
return;
}

setLoading(false);

} catch (error) {

console.error("Error checking admin role:", error);
router.push("/dashboard");

}

});

return () => unsubscribe();

}, [router]);

// 📥 Fetch reports (real-time)
useEffect(() => {

if (loading) return;

const q = collection(db, "reports");

const unsubscribe = onSnapshot(q, (snapshot) => {

const data = snapshot.docs.map((doc) => ({
id: doc.id,
...doc.data(),
}));

setReports(data);

});

return () => unsubscribe();

}, [loading]);

// Separate reports by status
const pendingReports = reports.filter(r => r.status === "pending");
const approvedReports = reports.filter(r => r.status === "approved");
const rejectedReports = reports.filter(r => r.status === "rejected");

// ✅ Approve report
const approveReport = async (id: string) => {

await updateDoc(doc(db, "reports", id), {
status: "approved",
});

setReports((prev) => prev.filter((r) => r.id !== id));

setMessage("Report approved successfully.");

setTimeout(() => {
setMessage("");
}, 3000);

};

// ❌ Reject report
const rejectReport = async (id: string) => {

await updateDoc(doc(db, "reports", id), {
status: "rejected",
});

setReports((prev) => prev.filter((r) => r.id !== id));

setMessage("Report rejected successfully.");

setTimeout(() => {
setMessage("");
}, 3000);

};

if (loading) return <div>Checking permissions...</div>;

return (

<AdminGuard>

<div
style={{
padding: "40px",
maxWidth: "900px",
margin: "0 auto",
fontFamily: "system-ui, sans-serif",
}}
>

<h1 style={{ marginBottom: "20px" }}>Admin Moderation Panel</h1>

{message && (

<div
style={{
backgroundColor: "#e6f4ea",
color: "#1e7e34",
padding: "12px",
borderRadius: "8px",
marginBottom: "20px",
fontWeight: 500,
}}
>
{message}
</div>
)}

<h2 style={{ marginTop: "30px" }}>Pending Reports</h2>

{pendingReports.length === 0 && (

<p style={{ color: "#666" }}>No pending reports.</p>
)}

{pendingReports.map((report) => (

<div
key={report.id}
style={{
border: "1px solid #e0e0e0",
borderRadius: "12px",
padding: "20px",
marginBottom: "20px",
boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
backgroundColor: "#ffffff",
}}
>

<div style={{ marginBottom: "10px" }}>
<strong
style={{
fontSize: "16px",
textTransform: "capitalize",
}}
>
{report.category}
</strong>
</div>

<p style={{ marginBottom: "15px", lineHeight: "1.5" }}>
{report.description}
</p>

<img
src={report.photoURL}
alt="Report"
style={{
width: "100%",
maxHeight: "250px",
objectFit: "cover",
borderRadius: "8px",
marginBottom: "15px",
}}
/>

<div style={{ display: "flex", gap: "10px" }}>

<button
onClick={() => approveReport(report.id)}
style={{
backgroundColor: "#28a745",
color: "#fff",
border: "none",
padding: "10px 16px",
borderRadius: "6px",
cursor: "pointer",
}}

>
Approve </button>

<button
onClick={() => rejectReport(report.id)}
style={{
backgroundColor: "#dc3545",
color: "#fff",
border: "none",
padding: "10px 16px",
borderRadius: "6px",
cursor: "pointer",
}}

>

Reject </button>

</div>

</div>

))}

<h2 style={{ marginTop: "40px" }}>Approved Reports</h2>

{approvedReports.map((report) => (

<p key={report.id}>{report.category} - approved</p>
))}

<h2 style={{ marginTop: "40px" }}>Rejected Reports</h2>

{rejectedReports.map((report) => (

<p key={report.id}>{report.category} - rejected</p>
))}

{/* Statistics Dashboard */} <AdminStats />

</div>

</AdminGuard>

);

}
