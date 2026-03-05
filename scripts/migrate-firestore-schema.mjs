import admin from "firebase-admin";

const dryRun = process.argv.includes("--dry-run");

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

const VALID_STATUSES = new Set(["pending", "approved", "rejected"]);
const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_SOURCES = new Set(["web-form", "field-capture", "offline-sync"]);

const report = {
  dryRun,
  events: {
    scanned: 0,
    changed: 0,
    skipped: 0,
    failedIds: [],
  },
  reports: {
    scanned: 0,
    changed: 0,
    skipped: 0,
    failedIds: [],
  },
};

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(value) {
  let longitude = value;

  while (longitude < -180) {
    longitude += 360;
  }

  while (longitude > 180) {
    longitude -= 360;
  }

  return longitude;
}

function normalizeCoordinates(latitude, longitude) {
  return {
    latitude: clamp(latitude, -90, 90),
    longitude: normalizeLongitude(longitude),
  };
}

function cellKey(latitude, longitude, cellSize) {
  const normalized = normalizeCoordinates(latitude, longitude);
  const latBucket = Math.floor((normalized.latitude + 90) / cellSize);
  const lngBucket = Math.floor((normalized.longitude + 180) / cellSize);

  return `${cellSize}:${latBucket}:${lngBucket}`;
}

function buildSpatial(latitude, longitude) {
  const normalized = normalizeCoordinates(latitude, longitude);
  const tokens = [
    cellKey(normalized.latitude, normalized.longitude, 1),
    cellKey(normalized.latitude, normalized.longitude, 0.25),
    cellKey(normalized.latitude, normalized.longitude, 0.05),
  ];

  return {
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    tokens: Array.from(new Set(tokens)),
    cell1: tokens[0],
    cell025: tokens[1],
    cell005: tokens[2],
  };
}

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  return null;
}

async function migrateEvents() {
  const snapshot = await db.collection("events").get();

  for (const doc of snapshot.docs) {
    report.events.scanned += 1;

    try {
      const data = doc.data();
      const updates = {};

      const hasVolunteersArray = Array.isArray(data.volunteers);
      const attendees = Array.isArray(data.attendees)
        ? data.attendees.filter((value) => typeof value === "string")
        : [];

      if (!hasVolunteersArray && attendees.length > 0) {
        updates.volunteers = attendees;
      }

      if (typeof data.district !== "string" || !data.district.trim()) {
        updates.district = "Unassigned";
      }

      if (Object.keys(updates).length === 0) {
        report.events.skipped += 1;
        continue;
      }

      if (!dryRun) {
        await doc.ref.update(updates);
      }

      report.events.changed += 1;
    } catch {
      report.events.failedIds.push(doc.id);
    }
  }
}

async function migrateReports() {
  const snapshot = await db.collection("reports").get();

  for (const doc of snapshot.docs) {
    report.reports.scanned += 1;

    try {
      const data = doc.data();
      const updates = {};

      const location = data.location;
      const hasLocation =
        typeof location === "object" &&
        location !== null &&
        typeof location.latitude === "number" &&
        typeof location.longitude === "number";

      let resolvedLocation = null;

      if (hasLocation) {
        resolvedLocation = normalizeCoordinates(location.latitude, location.longitude);
      } else {
        const latitude = asNumber(data.latitude);
        const longitude = asNumber(data.longitude);

        if (latitude != null && longitude != null) {
          resolvedLocation = normalizeCoordinates(latitude, longitude);
          updates.location = resolvedLocation;
        }
      }

      if (resolvedLocation) {
        if (asNumber(data.latitude) == null || asNumber(data.longitude) == null) {
          updates.latitude = resolvedLocation.latitude;
          updates.longitude = resolvedLocation.longitude;
        }

        const existingSpatial = data.spatial;
        const hasSpatial =
          typeof existingSpatial === "object" &&
          existingSpatial !== null &&
          Array.isArray(existingSpatial.tokens) &&
          typeof existingSpatial.cell1 === "string" &&
          typeof existingSpatial.cell025 === "string" &&
          typeof existingSpatial.cell005 === "string";

        if (!hasSpatial) {
          const spatial = buildSpatial(resolvedLocation.latitude, resolvedLocation.longitude);
          updates.spatial = {
            tokens: spatial.tokens,
            cell1: spatial.cell1,
            cell025: spatial.cell025,
            cell005: spatial.cell005,
          };
        }
      }

      if (!VALID_STATUSES.has(data.status)) {
        updates.status = "pending";
      }

      if (!VALID_SEVERITIES.has(data.severity)) {
        updates.severity = "medium";
      }

      if (!VALID_SOURCES.has(data.source)) {
        updates.source = "web-form";
      }

      if (typeof data.district !== "string" || !data.district.trim()) {
        updates.district = "Unassigned";
      }

      if (!data.createdAt) {
        updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      if (!data.capturedAt) {
        const createdDate = toDate(data.createdAt);
        updates.capturedAt = createdDate ?? new Date();
      }

      if (!data.temporal || typeof data.temporal !== "object") {
        const temporalSource = toDate(data.capturedAt) ?? toDate(data.createdAt) ?? new Date();
        const iso = temporalSource.toISOString();

        updates.temporal = {
          day: iso.slice(0, 10),
          month: iso.slice(0, 7),
        };
      }

      if (data.moderatedAt === undefined) {
        updates.moderatedAt = null;
      }

      if (data.moderatedBy === undefined) {
        updates.moderatedBy = null;
      }

      if (Object.keys(updates).length === 0) {
        report.reports.skipped += 1;
        continue;
      }

      if (!dryRun) {
        await doc.ref.update(updates);
      }

      report.reports.changed += 1;
    } catch {
      report.reports.failedIds.push(doc.id);
    }
  }
}

async function run() {
  await migrateEvents();
  await migrateReports();

  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
