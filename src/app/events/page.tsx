"use client";

import { useEffect, useState } from "react";
import {
  arrayUnion,
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { normalizeEventDoc, type EventRecord } from "../../lib/schemas";
import { useAuth } from "../../components/providers/AuthProvider";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  eventId?: string;
  createdAt: any;
  read: boolean;
}

export default function EventsPage() {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    const loadEvents = async () => {
      const eventsQuery = query(collection(db, "events"), orderBy("date", "asc"));
      const snapshot = await getDocs(eventsQuery);
      const data = snapshot.docs.map((item) =>
        normalizeEventDoc(item.id, item.data())
      );

      setEvents(data);
      setLoading(false);
    };

    loadEvents().catch((error) => {
      console.error("Error loading events:", error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
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
    };

    loadNotifications().catch((error) => {
      console.error("Error loading notifications:", error);
    });
  }, []);

  const joinEvent = async (event: EventRecord) => {
    if (!user) {
      alert("Please sign in to join this event.");
      return;
    }

    if (event.volunteers.includes(user.uid)) {
      alert("You already joined this event.");
      return;
    }

    // Check if max volunteers reached
    if (event.maxVolunteers && event.volunteers.length >= event.maxVolunteers) {
      alert("This event has reached its maximum number of volunteers.");
      return;
    }

    setJoiningEventId(event.id);

    try {
      await updateDoc(doc(db, "events", event.id), {
        volunteers: arrayUnion(user.uid),
      });

      setEvents((prev) =>
        prev.map((item) =>
          item.id === event.id
            ? {
                ...item,
                volunteers: [...item.volunteers, user.uid],
              }
            : item
        )
      );

      setSuccessMessage(`✓ You've joined "${event.title}"!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error joining event:", error);
      alert("Failed to join event. Please try again.");
    } finally {
      setJoiningEventId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Community Cleanup Events</h1>
          <p className="page-subtitle">
            Coordinate volunteers, track participation, and mobilize local cleanup teams.
          </p>
        </div>
      </header>

      {successMessage && (
        <div
          className="alert"
          style={{
            background: "#d4edda",
            color: "#155724",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            border: "1px solid #c3e6cb",
          }}
        >
          {successMessage}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem", background: "#f0f8ff", borderLeft: "4px solid #0066cc" }}>
          <h3 style={{ marginTop: 0, color: "#0066cc" }}>📢 Recent Announcements</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {notifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                style={{
                  padding: "0.75rem",
                  background: "white",
                  borderRadius: "0.5rem",
                  borderLeft: "3px solid #0066cc",
                }}
              >
                <strong style={{ color: "#0066cc" }}>{notif.title}</strong>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#666" }}>
                  {notif.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="panel muted">Loading events...</div>}

      {!loading && events.length === 0 && (
        <div className="empty-state">No cleanup events scheduled yet.</div>
      )}

      {!loading && events.length > 0 && (
        <div className="grid two">
          {events.map((event) => {
            const isJoined = Boolean(user && event.volunteers.includes(user.uid));
            const isFull = Boolean(
              event.maxVolunteers && event.volunteers.length >= event.maxVolunteers
            );
            const spotsLeft = event.maxVolunteers
              ? event.maxVolunteers - event.volunteers.length
              : null;

            return (
              <article
                key={event.id}
                className="card"
                style={{
                  borderLeft: isJoined ? "4px solid #28a745" : "4px solid #ddd",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>{event.title}</h3>
                  {isJoined && (
                    <span
                      style={{
                        background: "#28a745",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      ✓ Joined
                    </span>
                  )}
                </div>

                <p>{event.description}</p>

                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #eee",
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  <p style={{ margin: "0.25rem 0" }}>
                    📅 {formatDate(event.date)}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>📍 {event.district}</p>
                  <p style={{ margin: "0.25rem 0" }}>
                    👥 {event.volunteers.length}
                    {event.maxVolunteers ? `/${event.maxVolunteers}` : ""} volunteers
                  </p>
                  {isFull && (
                    <p style={{ margin: "0.5rem 0 0 0", color: "#d9534f", fontWeight: "bold" }}>
                      Event is full
                    </p>
                  )}
                  {spotsLeft && spotsLeft > 0 && spotsLeft <= 3 && (
                    <p style={{ margin: "0.5rem 0 0 0", color: "#ff9800", fontWeight: "bold" }}>
                      Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left!
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={joiningEventId === event.id || isFull || isJoined}
                  className={isJoined || isFull ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                  style={{
                    marginTop: "1rem",
                    width: "100%",
                    opacity: joiningEventId === event.id ? 0.6 : 1,
                    cursor:
                      joiningEventId === event.id || isFull ? "not-allowed" : "pointer",
                  }}
                  onClick={() => joinEvent(event)}
                >
                  {isJoined
                    ? "✓ Already Joined"
                    : isFull
                      ? "Event Full"
                      : joiningEventId === event.id
                        ? "Joining..."
                        : "Join Event"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


