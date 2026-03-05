import { NextResponse } from "next/server";
import type { DocumentData, Query } from "firebase-admin/firestore";
import {
  adminDb,
  isAdminIdentity,
  verifyRequestToken,
} from "../../../../lib/firebase-admin";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  REPORT_STATUSES,
  normalizeReportDoc,
  toDate,
  type ReportCategory,
  type ReportRecord,
  type ReportSeverity,
  type ReportStatus,
} from "../../../../lib/schemas";
import {
  bboxToTokens,
  isPointInBoundingBox,
  parseBoundingBox,
} from "../../../../lib/spatial";

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;
const MAX_SCAN_LIMIT = 1200;

type SearchFilters = {
  status: ReportStatus;
  categories: Set<ReportCategory>;
  severities: Set<ReportSeverity>;
  district: string;
  from: Date | null;
  to: Date | null;
  cursor: Date | null;
  limit: number;
  bboxRaw: string | null;
};

function parseEnumList<T extends string>(
  raw: string | null,
  allowedValues: readonly T[],
  label: string
): Set<T> {
  if (!raw) {
    return new Set();
  }

  const allowed = new Set(allowedValues);
  const values = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const value of values) {
    if (!allowed.has(value as T)) {
      throw new Error(`Invalid ${label} value: ${value}`);
    }
  }

  return new Set(values as T[]);
}

function parseDate(raw: string | null, label: string): Date | null {
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} date`);
  }

  return parsed;
}

function parseLimit(raw: string | null) {
  if (!raw) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid limit value");
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function toIso(value: unknown) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function serializeReport(report: ReportRecord) {
  return {
    ...report,
    createdAt: toIso(report.createdAt),
    capturedAt: toIso(report.capturedAt),
    moderatedAt: toIso(report.moderatedAt),
  };
}

function parseFilters(request: Request): SearchFilters {
  const { searchParams } = new URL(request.url);

  const statusRaw = searchParams.get("status") ?? "approved";
  if (!REPORT_STATUSES.includes(statusRaw as ReportStatus)) {
    throw new Error("Invalid status filter");
  }

  const categories = parseEnumList(
    searchParams.get("categories") ?? searchParams.get("category"),
    REPORT_CATEGORIES,
    "category"
  );

  const severities = parseEnumList(
    searchParams.get("severities") ?? searchParams.get("severity"),
    REPORT_SEVERITIES,
    "severity"
  );

  const district = (searchParams.get("district") ?? "").trim();

  return {
    status: statusRaw as ReportStatus,
    categories,
    severities,
    district,
    from: parseDate(searchParams.get("from"), "from"),
    to: parseDate(searchParams.get("to"), "to"),
    cursor: parseDate(searchParams.get("cursor"), "cursor"),
    limit: parseLimit(searchParams.get("limit")),
    bboxRaw: searchParams.get("bbox"),
  };
}

function applyInMemoryFilters(
  reports: ReportRecord[],
  filters: SearchFilters,
  bbox: ReturnType<typeof parseBoundingBox>
) {
  return reports.filter((report) => {
    if (filters.categories.size > 0 && !filters.categories.has(report.category)) {
      return false;
    }

    if (filters.severities.size > 0 && !filters.severities.has(report.severity)) {
      return false;
    }

    if (
      filters.district &&
      report.district.toLowerCase() !== filters.district.toLowerCase()
    ) {
      return false;
    }

    if (bbox && report.location) {
      return isPointInBoundingBox(
        report.location.latitude,
        report.location.longitude,
        bbox
      );
    }

    if (bbox && !report.location) {
      return false;
    }

    return true;
  });
}

export async function GET(req: Request) {
  try {
    const filters = parseFilters(req);

    if (filters.status !== "approved") {
      const identity = await verifyRequestToken(req);
      if (!identity) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const isAdmin = await isAdminIdentity(identity.uid, identity.admin);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const bbox = parseBoundingBox(filters.bboxRaw);
    if (filters.bboxRaw && !bbox) {
      return NextResponse.json({ error: "Invalid bbox format" }, { status: 400 });
    }

    const spatialTokens = bbox ? bboxToTokens(bbox, 1, 30) : [];
    const serverLimit = Math.min(
      MAX_SCAN_LIMIT,
      filters.limit * (spatialTokens.length > 0 ? 3 : 2)
    );

    let reportQuery: Query<DocumentData> =
      adminDb.collection("reports").where("status", "==", filters.status);

    if (filters.from) {
      reportQuery = reportQuery.where("createdAt", ">=", filters.from);
    }

    if (filters.to) {
      reportQuery = reportQuery.where("createdAt", "<=", filters.to);
    }

    if (filters.cursor) {
      reportQuery = reportQuery.where("createdAt", "<", filters.cursor);
    }

    if (spatialTokens.length > 0) {
      reportQuery = reportQuery.where(
        "spatial.tokens",
        "array-contains-any",
        spatialTokens
      );
    }

    const snapshot = await reportQuery
      .orderBy("createdAt", "desc")
      .limit(serverLimit)
      .get();

    const normalized = snapshot.docs.map((doc) =>
      normalizeReportDoc(doc.id, doc.data())
    );

    const filtered = applyInMemoryFilters(normalized, filters, bbox)
      .sort((a, b) => {
        const left = toDate(a.createdAt)?.getTime() ?? 0;
        const right = toDate(b.createdAt)?.getTime() ?? 0;
        return right - left;
      })
      .slice(0, filters.limit);

    const payload = filtered.map(serializeReport);
    const nextCursor =
      payload.length > 0 ? payload[payload.length - 1]?.createdAt ?? null : null;

    return NextResponse.json({
      reports: payload,
      meta: {
        requested: filters.limit,
        scanned: snapshot.size,
        returned: payload.length,
        nextCursor,
        bboxApplied: Boolean(bbox),
        spatialTokens: spatialTokens.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid query";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

