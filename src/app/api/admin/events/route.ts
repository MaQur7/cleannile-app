import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin
let app: any;
try {
  app = initializeApp({
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
} catch (error) {
  app = undefined;
}

const db = getFirestore(app);

interface CreateEventRequest {
  title: string;
  description: string;
  date: string;
  district: string;
  maxVolunteers?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create events" },
        { status: 403 }
      );
    }

    // Parse request body
    const body: CreateEventRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.description || !body.date || !body.district) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, date, district" },
        { status: 400 }
      );
    }

    // Create event document
    const eventData = {
      title: body.title,
      description: body.description,
      date: body.date,
      district: body.district,
      volunteers: [],
      createdBy: uid,
      createdAt: new Date(),
      maxVolunteers: body.maxVolunteers || null,
      location: body.location || null,
    };

    const eventRef = await db.collection("events").add(eventData);

    // Send notifications to all users (except for now, store notifications in a collection)
    await db.collection("notifications").add({
      type: "event_created",
      title: `New Event: ${body.title}`,
      description: `A new cleanup event has been created in ${body.district}`,
      eventId: eventRef.id,
      district: body.district,
      createdAt: new Date(),
      read: false,
    });

    return NextResponse.json(
      {
        id: eventRef.id,
        message: "Event created successfully",
        ...eventData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// GET events (optional, for admin listing)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can view all events" },
        { status: 403 }
      );
    }

    // Fetch all events
    const snapshot = await db.collection("events").orderBy("date", "asc").get();
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
