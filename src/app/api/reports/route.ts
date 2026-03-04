import { NextResponse } from "next/server";
import { z } from "zod";
import admin from "firebase-admin";

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.ADMIN_PROJECT_ID,
      clientEmail: process.env.ADMIN_CLIENT_EMAIL,
      privateKey: process.env.ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// Define validation schema
const reportSchema = z.object({
  category: z.string().min(2),
  description: z.string().min(5),
  photoURL: z.string().url(),
  latitude: z.number(),
  longitude: z.number(),
  userId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input
    const validated = reportSchema.parse(body);

    await db.collection("reports").add({
      category: validated.category,
      description: validated.description,
      photoURL: validated.photoURL,
      location: {
        latitude: validated.latitude,
        longitude: validated.longitude,
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: validated.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}