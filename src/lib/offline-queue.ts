import type { ReportCategory, ReportSeverity, ReportSource } from "./schemas";

export type QueuedReport = {
  id: string;
  category: ReportCategory;
  severity: ReportSeverity;
  district: string;
  description: string;
  latitude: number;
  longitude: number;
  photoDataURL: string;
  source: ReportSource;
  capturedAt: string;
  queuedAt: string;
};

const STORAGE_KEY = "cleannile:offline-report-queue:v1";
const MAX_QUEUE_SIZE = 40;

function hasWindow() {
  return typeof window !== "undefined";
}

function parseQueue(raw: string | null): QueuedReport[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is QueuedReport => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<QueuedReport>;

      return (
        typeof candidate.id === "string" &&
        typeof candidate.category === "string" &&
        typeof candidate.severity === "string" &&
        typeof candidate.description === "string" &&
        typeof candidate.district === "string" &&
        typeof candidate.photoDataURL === "string" &&
        typeof candidate.source === "string" &&
        typeof candidate.capturedAt === "string" &&
        typeof candidate.queuedAt === "string" &&
        typeof candidate.latitude === "number" &&
        typeof candidate.longitude === "number"
      );
    });
  } catch {
    return [];
  }
}

export function getQueuedReports() {
  if (!hasWindow()) {
    return [];
  }

  return parseQueue(window.localStorage.getItem(STORAGE_KEY));
}

export function setQueuedReports(items: QueuedReport[]) {
  if (!hasWindow()) {
    return;
  }

  const limited = items.slice(0, MAX_QUEUE_SIZE);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
}

export function enqueueReport(item: QueuedReport) {
  const current = getQueuedReports();
  current.unshift(item);
  setQueuedReports(current);
}

export function removeQueuedReport(id: string) {
  const next = getQueuedReports().filter((item) => item.id !== id);
  setQueuedReports(next);
}

export function clearQueuedReports() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
