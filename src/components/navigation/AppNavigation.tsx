"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../providers/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const AUTH_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/capture", label: "Quick Capture" },
  { href: "/report/new", label: "New Report" },
  { href: "/events", label: "Events" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Moderation", adminOnly: true },
  { href: "/map", label: "GIS Workspace", adminOnly: true },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading, signOutUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const showNav = pathname ? !pathname.startsWith("/api") : false;

  const navItems = useMemo(
    () => AUTH_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  useEffect(() => {
    if (!isAuthenticated || loading) {
      return;
    }

    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [isAuthenticated, loading, navItems, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!showNav) {
    return null;
  }

  const handleLogout = async () => {
    try {
      setBusy(true);
      await signOutUser();
      router.replace("/login");
    } finally {
      setBusy(false);
      setMobileOpen(false);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="brand-link">
          <span className="brand-dot" />
          <span>CleanNile</span>
        </Link>

        {isAuthenticated && !loading && (
          <nav className="app-nav" aria-label="Main navigation">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-nav-link ${active ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="app-header-actions">
          {isAuthenticated && (
            <button
              type="button"
              className="btn btn-ghost btn-sm nav-toggle"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>
          )}

          {!isAuthenticated && (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          )}

          {isAuthenticated && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              disabled={busy}
            >
              {busy ? "Signing out..." : "Sign out"}
            </button>
          )}
        </div>
      </div>

      {isAuthenticated && !loading && (
        <nav
          id="mobile-navigation"
          className={`app-nav-mobile ${mobileOpen ? "open" : ""}`}
          aria-label="Mobile navigation"
        >
          {navItems.map((item, index) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-mobile-link ${active ? "active" : ""}`}
                style={{ transitionDelay: mobileOpen ? `${index * 25}ms` : "0ms" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
