"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDoc,
} from "firebase/firestore";

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
  let unsubscribeReports: any;

  const loadProfile = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      setUserData(userDoc.data());
    }

    const q = query(
      collection(db, "reports"),
      where("userId", "==", user.uid)
    );

    unsubscribeReports = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReports(data);
    });

    setLoading(false);
  };

  loadProfile();

  return () => {
    if (unsubscribeReports) unsubscribeReports();
  };
}, [router]);

  if (loading) return <div>Loading profile...</div>;

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>My Profile</h1>

      <div
        style={{
          background: "#f8f9fa",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "30px",
        }}
      >
        <p><strong>Email:</strong> {auth.currentUser?.email}</p>
        <p><strong>Role:</strong> {userData?.role}</p>
      </div>

      <h2>My Reports</h2>

      {reports.length === 0 && <p>You have not submitted any reports.</p>}

      {reports.map((report) => (
        <div
          key={report.id}
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          <p><strong>{report.category}</strong></p>
          <p>{report.description}</p>

          <p>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color:
                  report.status === "approved"
                    ? "green"
                    : report.status === "rejected"
                    ? "red"
                    : "orange",
              }}
            >
              {report.status}
            </span>
          </p>

          <img
            src={report.photoURL}
            alt="Report"
            style={{ width: "200px", borderRadius: "6px" }}
          />
        </div>
      ))}
    </div>
  );
}