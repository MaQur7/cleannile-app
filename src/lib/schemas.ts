import { z } from "zod";

export const REPORT_CATEGORIES = ["pollution", "waste", "water"] as const;
export const REPORT_STATUSES = ["pending", "approved", "rejected"] as const;
export const REPORT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const REPORT_SOURCES = ["web-form", "field-capture", "offline-sync"] as const;
export const USER_ROLES = ["user", "admin"] as const;

export const reportCategorySchema = z.enum(REPORT_CATEGORIES);
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export const reportSeveritySchema = z.enum(REPORT_SEVERITIES);
export const reportSourceSchema = z.enum(REPORT_SOURCES);
export const userRoleSchema = z.enum(USER_ROLES);

export const reportLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const reportSubmissionSchema = z.object({
  category: reportCategorySchema,
  severity: reportSeveritySchema.default("medium"),
  district: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).default(""),
  photoURL: z.string().url(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  source: reportSourceSchema.default("web-form"),
  capturedAt: z.string().datetime().optional(),
});

export const adminReportStatusPatchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export type ReportCategory = z.infer<typeof reportCategorySchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportSeverity = z.infer<typeof reportSeveritySchema>;
export type ReportSource = z.infer<typeof reportSourceSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type ReportSubmissionInput = z.infer<typeof reportSubmissionSchema>;

export type ReportRecord = {
  id: string;
  category: ReportCategory;
  severity: ReportSeverity;
  district: string;
  source: ReportSource;
  description: string;
  photoURL: string;
  location: { latitude: number; longitude: number } | null;
  status: ReportStatus;
  createdAt: unknown;
  capturedAt: unknown;
  userId: string;
  moderatedAt: unknown;
  moderatedBy: string | null;
  spatial: {
    tokens: string[];
    cell1: string;
    cell025: string;
    cell005: string;
  } | null;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  date: string;
  district: string;
  volunteers: string[];
  createdBy: string;
  createdAt: unknown;
  location?: {
    latitude: number;
    longitude: number;
  };
  maxVolunteers?: number;
};

export type UserRecord = {
  id: string;
  email: string;
  role: UserRole;
  joinedAt: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const obj = asObject(value);
  const seconds = obj?.seconds;
  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    return new Date(seconds * 1000);
  }

  return null;
}

function normalizeSpatial(raw: Record<string, unknown>) {
  const rawSpatial = asObject(raw.spatial);
  if (!rawSpatial) {
    return null;
  }

  const tokens = asStringArray(rawSpatial.tokens);
  const cell1 = asString(rawSpatial.cell1);
  const cell025 = asString(rawSpatial.cell025);
  const cell005 = asString(rawSpatial.cell005);

  if (!tokens.length && !cell1 && !cell025 && !cell005) {
    return null;
  }

  return {
    tokens,
    cell1,
    cell025,
    cell005,
  };
}

export function normalizeReportDoc(
  id: string,
  raw: Record<string, unknown>
): ReportRecord {
  const rawLocation = asObject(raw.location);
  const locationCandidate = {
    latitude: asNumber(rawLocation?.latitude ?? raw.latitude),
    longitude: asNumber(rawLocation?.longitude ?? raw.longitude),
  };

  const parsedLocation = reportLocationSchema.safeParse(locationCandidate);
  const parsedCategory = reportCategorySchema.safeParse(raw.category);
  const parsedStatus = reportStatusSchema.safeParse(raw.status);
  const parsedSeverity = reportSeveritySchema.safeParse(raw.severity);
  const parsedSource = reportSourceSchema.safeParse(raw.source);

  return {
    id,
    category: parsedCategory.success ? parsedCategory.data : "pollution",
    severity: parsedSeverity.success ? parsedSeverity.data : "medium",
    district: asString(raw.district, "Unassigned"),
    source: parsedSource.success ? parsedSource.data : "web-form",
    description: asString(raw.description),
    photoURL: asString(raw.photoURL),
    location: parsedLocation.success ? parsedLocation.data : null,
    status: parsedStatus.success ? parsedStatus.data : "pending",
    createdAt: raw.createdAt ?? null,
    capturedAt: raw.capturedAt ?? null,
    userId: asString(raw.userId),
    moderatedAt: raw.moderatedAt ?? null,
    moderatedBy: asNullableString(raw.moderatedBy),
    spatial: normalizeSpatial(raw),
  };
}

export function normalizeEventDoc(
  id: string,
  raw: Record<string, unknown>
): EventRecord {
  const volunteersSource =
    (Array.isArray(raw.volunteers) ? raw.volunteers : null) ??
    (Array.isArray(raw.attendees) ? raw.attendees : []);

  const volunteers = volunteersSource.filter(
    (value): value is string => typeof value === "string"
  );

  const rawLocation = asObject(raw.location);
  const locationCandidate = {
    latitude: asNumber(rawLocation?.latitude),
    longitude: asNumber(rawLocation?.longitude),
  };

  const parsedLocation = locationCandidate.latitude && locationCandidate.longitude ? locationCandidate : undefined;

  return {
    id,
    title: asString(raw.title),
    description: asString(raw.description),
    date: asString(raw.date),
    district: asString(raw.district, "Unassigned"),
    volunteers,
    createdBy: asString(raw.createdBy),
    createdAt: raw.createdAt ?? null,
    location: parsedLocation as any,
    maxVolunteers: asNumber(raw.maxVolunteers) ?? undefined,
  };
}

export function normalizeUserDoc(
  id: string,
  raw: Record<string, unknown>
): UserRecord {
  const parsedRole = userRoleSchema.safeParse(raw.role);

  return {
    id,
    email: asString(raw.email),
    role: parsedRole.success ? parsedRole.data : "user",
    joinedAt: raw.joinedAt ?? null,
  };
}


