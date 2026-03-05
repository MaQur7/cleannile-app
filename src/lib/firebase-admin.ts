import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.ADMIN_PROJECT_ID,
      clientEmail: process.env.ADMIN_CLIENT_EMAIL,
      privateKey: process.env.ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function verifyRequestToken(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function isAdminIdentity(uid: string, claimAdmin?: unknown) {
  if (claimAdmin === true) {
    return true;
  }

  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    return false;
  }

  return userDoc.data()?.role === "admin";
}

