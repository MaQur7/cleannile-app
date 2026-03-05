import { NextResponse } from "next/server";
import {
  adminDb,
  serverTimestamp,
  verifyRequestToken,
} from "../../../lib/firebase-admin";
import { reportSubmissionSchema } from "../../../lib/schemas";
import { buildSpatialIndex } from "../../../lib/spatial";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  const identity = await verifyRequestToken(req);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = reportSubmissionSchema.parse(body);
    const spatial = buildSpatialIndex(validated.latitude, validated.longitude);
    const district = validated.district?.trim() ? validated.district.trim() : "Unassigned";
    const capturedAt = validated.capturedAt ? new Date(validated.capturedAt) : new Date();
    const capturedAtIso = capturedAt.toISOString();

    const created = await adminDb.collection("reports").add({
      category: validated.category,
      severity: validated.severity,
      district,
      source: validated.source,
      description: validated.description,
      photoURL: validated.photoURL,
      location: {
        latitude: spatial.latitude,
        longitude: spatial.longitude,
      },
      latitude: spatial.latitude,
      longitude: spatial.longitude,
      spatial: {
        tokens: spatial.tokens,
        cell1: spatial.cell1,
        cell025: spatial.cell025,
        cell005: spatial.cell005,
      },
      capturedAt,
      temporal: {
        day: capturedAtIso.slice(0, 10),
        month: capturedAtIso.slice(0, 7),
      },
      status: "pending",
      createdAt: serverTimestamp(),
      userId: identity.uid,
      moderatedAt: null,
      moderatedBy: null,
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Invalid report payload") },
      { status: 400 }
    );
  }
}
