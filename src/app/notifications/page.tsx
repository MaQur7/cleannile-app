"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  eventId?: string;
  district?: string;
  createdAt: any;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notificationsQuery = query(
          collection(db, "notifications"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(notificationsQuery);
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Notification[];

        setNotifications(data);
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const formatDate = (dateValue: any) => {
    try {
      let date: Date;
      if (dateValue?.toDate) {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === "string") {
        date = new Date(dateValue);
      } else {
        return "Recently";
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "event_created":
        return "📢";
      case "event_joined":
        return "✓";
      case "report_approved":
        return "✓";
      case "report_rejected":
        return "✕";
      default:
        return "📬";
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Stay updated with event announcements, report status changes, and
            community updates.
          </p>
        </div>
      </header>

      {loading && <div className="panel muted">Loading notifications...</div>}

      {!loading && notifications.length === 0 && (
        <div className="empty-state">
          <p>No notifications yet. You'll see updates about events and reports here.</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="grid one" style={{ maxWidth: "100%" }}>
          {notifications.map((notif) => (
            <article
              key={notif.id}
              className="card"
              style={{
                borderLeft: "4px solid #0066cc",
                background: notif.read ? "#f9f9f9" : "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{getIcon(notif.type)}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem" }}>{notif.title}</h3>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.85rem",
                        color: "#999",
                      }}
                    >
                      {formatDate(notif.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <p style={{ margin: "0.75rem 0 0 0", color: "#555" }}>
                {notif.description}
              </p>

              {notif.district && (
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "#999" }}>
                  📍 {notif.district}
                </p>
              )}

              {notif.type === "event_created" && (
                <a
                  href="/events"
                  style={{
                    display: "inline-block",
                    marginTop: "0.75rem",
                    color: "#0066cc",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  View Events →
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
