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

export default function EventsPage() {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  const joinEvent = async (event: EventRecord) => {
    if (!user) {
      alert("Please sign in to join this event.");
      return;
    }

    if (event.volunteers.includes(user.uid)) {
      alert("You already joined this event.");
      return;
    }

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

      {loading && <div className="panel muted">Loading events...</div>}

      {!loading && events.length === 0 && (
        <div className="empty-state">No cleanup events scheduled yet.</div>
      )}

      {!loading && events.length > 0 && (
        <div className="grid two">
          {events.map((event) => (
            <article key={event.id} className="card">
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <p className="muted" style={{ marginTop: "0.6rem" }}>
                Date: {event.date}
              </p>
              <p className="muted">District: {event.district}</p>
              <p className="muted">Volunteers: {event.volunteers.length}</p>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "0.85rem" }}
                onClick={() => joinEvent(event)}
              >
                Join Cleanup
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


