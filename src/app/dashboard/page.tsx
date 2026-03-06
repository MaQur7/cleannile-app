"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../components/providers/AuthProvider";

type DashboardTile = {
  href: string;
  title: string;
  description: string;
  adminOnly?: boolean;
  emphasis?: "field" | "admin";
};

const TILES: DashboardTile[] = [
  {
    href: "/capture",
    title: "Field Quick Capture",
    description: "One-tap mobile capture with GPS, camera, and offline queue.",
    emphasis: "field",
  },
  {
    href: "/report/new",
    title: "Detailed Report Form",
    description: "Submit richer contextual reports with guided metadata fields.",
  },
  {
    href: "/events",
    title: "Community Events",
    description: "Join cleanup activities and coordinate volunteers.",
  },
  {
    href: "/profile",
    title: "My Profile",
    description: "Track your submitted reports and approval outcomes.",
  },
  {
    href: "/admin",
    title: "Moderation Queue",
    description: "Review pending reports and publish verified incidents.",
    adminOnly: true,
    emphasis: "admin",
  },
  {
    href: "/map",
    title: "GIS Workspace",
    description: "Analyze hotspots, map layers, and temporal incident patterns.",
    adminOnly: true,
    emphasis: "admin",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { role, isAdmin, user, signOutUser } = useAuth();

  useEffect(() => {
    const prefetchTargets = [
      "/capture",
      "/report/new",
      "/events",
      "/profile",
      "/admin",
      "/map",
    ];

    prefetchTargets.forEach((path) => {
      router.prefetch(path);
    });
  }, [router]);

  const availableTiles = TILES.filter((tile) => !tile.adminOnly || isAdmin);

  return (
    <AuthGuard>
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Operations Dashboard</h1>
            <p className="page-subtitle">
              Central workspace for field reporting, geospatial intelligence, and coordinated response.
            </p>
          </div>
        </header>

        {/* User Profile Section */}
        <div className="grid two" style={{ marginBottom: "2rem" }}>
          <article className="card">
            <h3 style={{ marginTop: 0 }}>👤 Profile</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <p className="stat-label">Email</p>
                <p className="muted" style={{ margin: 0 }}>{user?.email ?? "Unknown"}</p>
              </div>
              <div>
                <p className="stat-label">Role</p>
                <p className="muted" style={{ margin: 0, textTransform: "capitalize" }}>
                  {role ?? "user"}
                </p>
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Link href="/profile" className="btn btn-secondary btn-sm">
                View Profile
              </Link>
            </div>
          </article>

          <article className="card">
            <h3 style={{ marginTop: 0 }}>🚀 Quick Actions</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Link href="/capture" className="btn btn-primary">
                📱 Quick Capture
              </Link>
              <Link href="/report/new" className="btn btn-secondary">
                📝 New Report
              </Link>
            </div>
          </article>
        </div>

        <div className="grid three">
          {availableTiles.map((tile) => (
            <article
              key={tile.href}
              className={`card dashboard-tile ${tile.emphasis ? `dashboard-${tile.emphasis}` : ""}`}
            >
              <h3>{tile.title}</h3>
              <p>{tile.description}</p>
              <div style={{ marginTop: "0.8rem" }}>
                <Link href={tile.href} className="btn btn-primary btn-sm">
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div
          className="panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <p className="muted" style={{ margin: 0 }}>
            Core routes are prefetched for smoother transitions.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              signOutUser()
                .then(() => router.replace("/login"))
                .catch((error) => {
                  console.error("Sign out failed:", error);
                });
            }}
          >
            Sign Out
          </button>
        </div>
      </section>
    </AuthGuard>
  );
}
