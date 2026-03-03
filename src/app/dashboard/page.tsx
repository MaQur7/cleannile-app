"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>
      <p>Welcome to CleanNile dashboard.</p>

      <button onClick={() => router.push("/admin")}>
  Admin Panel
</button>

      <button onClick={() => router.push("/profile")}>
  My Profile
</button>

      <button onClick={() => router.push("/report/new")}>
        Submit Report
      </button>

      <br /><br />

      <button onClick={() => router.push("/map")}>
        View Map
      </button>

      <br /><br />

      <button onClick={() => auth.signOut()}>
        Logout
      </button>
    </div>
  );
}