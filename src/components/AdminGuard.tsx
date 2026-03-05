"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";
import PageLoader from "./ui/PageLoader";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isAuthenticated, loading, router]);

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <PageLoader
        title="Checking permissions"
        description="Verifying administrator access rights."
      />
    );
  }

  return <>{children}</>;
}
