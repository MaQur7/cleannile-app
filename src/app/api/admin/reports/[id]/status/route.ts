import { NextResponse } from "next/server";
import {
  adminDb,
  isAdminIdentity,
  serverTimestamp,
  verifyRequestToken,
} from "../../../../../../lib/firebase-admin";
import { adminReportStatusPatchSchema } from "../../../../../../lib/schemas";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function PATCH(req: Request, context: RouteContext) {
  const identity = await verifyRequestToken(req);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await isAdminIdentity(identity.uid, identity.admin);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(context.params);
  if (!id) {
    return NextResponse.json({ error: "Missing report id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validated = adminReportStatusPatchSchema.parse(body);

    const reportRef = adminDb.collection("reports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await reportRef.update({
      status: validated.status,
      moderatedAt: serverTimestamp(),
      moderatedBy: identity.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Invalid status update payload") },
      { status: 400 }
    );
  }
}

