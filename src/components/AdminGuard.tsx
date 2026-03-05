"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AdminGuard({ children }: { children: React.ReactNode }) {

const router = useRouter();
const [checking, setChecking] = useState(true);

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

    setChecking(false);

  } catch (error) {
    console.error("Admin check failed:", error);
    router.push("/dashboard");
  }

});

return () => unsubscribe();

}, [router]);

if (checking) {
return <div style={{ padding: "40px" }}>Checking permissions...</div>;
}

return <>{children}</>;
}