"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../providers/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
  section?: "user" | "admin";
};

const USER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "user" },
  { href: "/events", label: "Events", section: "user" },
  { href: "/notifications", label: "Notifications", section: "user" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Moderation", adminOnly: true, section: "admin" },
  { href: "/admin/events", label: "Manage Events", adminOnly: true, section: "admin" },
  { href: "/map", label: "GIS Workspace", adminOnly: true, section: "admin" },
];

const ALL_ITEMS: NavItem[] = [...USER_ITEMS, ...ADMIN_ITEMS];

export default function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading, signOutUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const showNav = pathname ? !pathname.startsWith("/api") : false;

  const navItems = useMemo(
    () => ALL_ITEMS.filter((item) => !item.adminOnly || isAdmin),
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
            {navItems.map((item, index) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
              
              // Add separator before admin section
              const showSeparator = index > 0 && 
                navItems[index - 1]?.section === "user" && 
                item.section === "admin";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-nav-link ${active ? "active" : ""} ${item.section === "admin" && isAdmin ? "app-nav-link-admin" : ""}`}
                  style={showSeparator ? { marginLeft: "auto", paddingLeft: "1rem", borderLeft: "1px solid rgba(15, 23, 42, 0.15)" } : {}}
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

            // Add separator before admin section in mobile
            const showSeparator = index > 0 && 
              navItems[index - 1]?.section === "user" && 
              item.section === "admin";

            return (
              <div key={item.href}>
                {showSeparator && (
                  <div style={{ 
                    height: "1px", 
                    background: "rgba(15, 23, 42, 0.1)", 
                    margin: "0.5rem 0",
                    marginTop: "0.75rem"
                  }} />
                )}
                <Link
                  href={item.href}
                  className={`app-nav-mobile-link ${active ? "active" : ""} ${item.section === "admin" && isAdmin ? "app-nav-mobile-link-admin" : ""}`}
                  style={{ transitionDelay: mobileOpen ? `${index * 25}ms` : "0ms" }}
                >
                  {item.section === "admin" && isAdmin ? `⚙️ ${item.label}` : item.label}
                </Link>
              </div>
            );
          })}
        </nav>
      )}
    </header>
  );
}
