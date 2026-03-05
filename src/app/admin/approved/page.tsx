"use client";

import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function ApprovedReports() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      const q = query(
        collection(db, "reports"),
        where("status", "==", "approved")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReports(data);
    };

    loadReports();
  }, []);

  return (
    <main style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>
      <h1>Approved Reports</h1>

      {reports.map((report) => (
        <div key={report.id} style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "15px",
          marginBottom: "15px"
        }}>
          <strong>{report.category}</strong>

          <p>{report.description}</p>

          <img
            src={report.photoURL}
            style={{ width: "200px", borderRadius: "6px" }}
          />
        </div>
      ))}
    </main>
  );
}