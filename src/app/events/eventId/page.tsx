"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { normalizeEventDoc, type EventRecord } from "../../../lib/schemas";
import { useAuth } from "../../../components/providers/AuthProvider";

export default function EventPage() {
  const params = useParams<{ id?: string; eventId?: string }>();
  const eventId = useMemo(() => params?.id ?? params?.eventId ?? "", [params]);

  const { user } = useAuth();

  const [event, setEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const loadEvent = async () => {
      const ref = doc(db, "events", eventId);
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        setEvent(normalizeEventDoc(snapshot.id, snapshot.data()));
      }
    };

    loadEvent().catch((error) => {
      console.error("Error loading event:", error);
    });
  }, [eventId]);

  const signup = async () => {
    if (!user) {
      alert("Login required");
      return;
    }

    if (!eventId || !event) {
      alert("Invalid event id");
      return;
    }

    if (event.volunteers.includes(user.uid)) {
      alert("You already joined this cleanup.");
      return;
    }

    await updateDoc(doc(db, "events", eventId), {
      volunteers: arrayUnion(user.uid),
    });

    setEvent((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        volunteers: [...prev.volunteers, user.uid],
      };
    });
  };

  if (!event) {
    return (
      <div className="page-loader">
        <div className="loader-card">
          <p className="loader-title">Loading event details...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="page" style={{ maxWidth: "760px" }}>
      <header className="page-header">
        <div>
          <h1 className="page-title">{event.title}</h1>
          <p className="page-subtitle">{event.description}</p>
        </div>
      </header>

      <div className="panel">
        <p className="muted">Date: {event.date}</p>
        <p className="muted">District: {event.district}</p>
        <p className="muted">Volunteers: {event.volunteers.length}</p>

        <button type="button" className="btn btn-primary" onClick={signup}>
          Join cleanup
        </button>
      </div>
    </section>
  );
}


