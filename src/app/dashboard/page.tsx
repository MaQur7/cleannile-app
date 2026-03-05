"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import AuthGuard from "../../components/AuthGuard";

export default function DashboardPage() {
const router = useRouter();

const [role, setRole] = useState("");

useEffect(() => {
const unsubscribe = auth.onAuthStateChanged(async (user) => {
if (!user) {
router.push("/login");
return;
}

  try {
    const ref = doc(db, "users", user.uid);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      setRole(snapshot.data().role);
    }
  } catch (error) {
    console.error("Error loading user role:", error);
  }
});

return () => unsubscribe();

}, [router]);

return ( <AuthGuard>
<div style={{ padding: "20px" }}> <h1>Dashboard</h1> <p>Welcome to CleanNile dashboard.</p>


  {role === "admin" && (
    <>
      <button onClick={() => router.push("/admin")}>
        Admin Panel
      </button>

      <br /><br />

      <button onClick={() => router.push("/map")}>
        View Map
      </button>

      <br /><br />
    </>
  )}

  <button onClick={() => router.push("/profile")}>
    My Profile
  </button>

  <br /><br />

  <button onClick={() => router.push("/report/new")}>
    Submit Report
  </button>

  <br /><br />

  <button onClick={() => router.push("/events")}>
    Events
  </button>

  <br /><br />

  <button onClick={() => auth.signOut()}>
    Logout
  </button>
</div>

  </AuthGuard>
);
}