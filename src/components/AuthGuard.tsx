"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function AuthGuard({
children,
}: {
children: React.ReactNode;
}) {

const router = useRouter();
const [checking, setChecking] = useState(true);

useEffect(() => {

const unsubscribe = auth.onAuthStateChanged((user) => {

  if (!user) {
    router.push("/login");
    return;
  }

  setChecking(false);

});

return () => unsubscribe();

}, [router]);

if (checking) {
return <div style={{ padding: "40px" }}>Checking login...</div>;
}

return <>{children}</>;
}
