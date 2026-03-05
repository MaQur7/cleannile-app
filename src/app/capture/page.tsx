"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../components/providers/AuthProvider";
import {
  enqueueReport,
  getQueuedReports,
  removeQueuedReport,
  type QueuedReport,
} from "../../lib/offline-queue";
import {
  createReport,
  dataURLToFile,
  fileToDataURL,
  uploadReportPhoto,
} from "../../lib/report-submit";
import {
  type ReportCategory,
  type ReportSeverity,
  REPORT_SEVERITIES,
} from "../../lib/schemas";

const CATEGORY_ACTIONS: Array<{
  id: ReportCategory;
  label: string;
  icon: string;
  helper: string;
}> = [
  {
    id: "pollution",
    label: "Pollution",
    icon: "???",
    helper: "Air, soil, or industrial contamination",
  },
  {
    id: "waste",
    label: "Waste Dumping",
    icon: "???",
    helper: "Illegal dumping, plastics, and debris",
  },
  {
    id: "water",
    label: "Water Risk",
    icon: "??",
    helper: "Oil, sewage, or chemical discharge",
  },
];

function asCoordinates(position: GeolocationPosition) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy ?? 0),
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function FieldCapturePage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();

  const [category, setCategory] = useState<ReportCategory>("pollution");
  const [severity, setSeverity] = useState<ReportSeverity>("medium");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rapidMode, setRapidMode] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");

  const selectedCategoryMeta = useMemo(
    () => CATEGORY_ACTIONS.find((item) => item.id === category),
    [category]
  );

  const refreshQueueCount = useCallback(() => {
    setQueueCount(getQueuedReports().length);
  }, []);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is unavailable in this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords(asCoordinates(position));
        setLocating(false);
      },
      (error: GeolocationPositionError) => {
        console.error("Failed to acquire GPS location", error);
        setMessage("Unable to get GPS location. Enable location and retry.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      }
    );
  }, []);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    refreshQueueCount();
    refreshLocation();

    const onOnline = () => {
      setOnline(true);
      refreshQueueCount();
    };

    const onOffline = () => {
      setOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshLocation, refreshQueueCount]);

  const resetForRapidCapture = () => {
    setDescription("");
    setPhoto(null);
    refreshLocation();
  };

  const queueCurrentReport = useCallback(
    async (latitude: number, longitude: number) => {
      if (!photo) {
        throw new Error("Please attach a photo before queueing this report.");
      }

      const photoDataURL = await fileToDataURL(photo);

      const queuedItem: QueuedReport = {
        id: crypto.randomUUID(),
        category,
        severity,
        district: district.trim(),
        description: description.trim(),
        latitude,
        longitude,
        photoDataURL,
        source: "offline-sync",
        capturedAt: new Date().toISOString(),
        queuedAt: new Date().toISOString(),
      };

      enqueueReport(queuedItem);
      refreshQueueCount();
    },
    [category, description, district, photo, refreshQueueCount, severity]
  );

  const submitLive = useCallback(
    async (latitude: number, longitude: number) => {
      if (!user) {
        throw new Error("You need to sign in before submitting.");
      }

      if (!photo) {
        throw new Error("Attach a photo to continue.");
      }

      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error("Unable to verify session. Please sign in again.");
      }

      const photoURL = await uploadReportPhoto(photo, user.uid);
      await createReport(idToken, {
        category,
        severity,
        district: district.trim(),
        description: description.trim(),
        latitude,
        longitude,
        photoURL,
        source: "field-capture",
        capturedAt: new Date().toISOString(),
      });
    },
    [category, description, district, getIdToken, photo, severity, user]
  );

  const handleCapture = async () => {
    if (!coords) {
      setMessage("GPS fix is required. Tap Refresh GPS and retry.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      if (online) {
        await submitLive(coords.latitude, coords.longitude);
        setMessage("Report submitted.");
      } else {
        await queueCurrentReport(coords.latitude, coords.longitude);
        setMessage("Offline: report saved to queue.");
      }

      if (rapidMode) {
        resetForRapidCapture();
      } else {
        router.replace("/dashboard");
      }
    } catch (error) {
      console.error("Field capture failed", error);

      try {
        await queueCurrentReport(coords.latitude, coords.longitude);
        setMessage("Network issue: report queued for sync.");
        if (rapidMode) {
          resetForRapidCapture();
        }
      } catch (queueError) {
        setMessage(errorMessage(queueError, "Unable to save report."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const syncQueuedReports = async () => {
    if (!user) {
      setMessage("Sign in required to sync queued reports.");
      return;
    }

    const queued = getQueuedReports();
    if (!queued.length) {
      setMessage("Queue is empty.");
      return;
    }

    setSyncing(true);
    setMessage("");

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error("Unable to verify session. Please sign in again.");
      }

      let synced = 0;

      for (const item of queued) {
        try {
          const queuedPhoto = dataURLToFile(item.photoDataURL, `${item.id}.jpg`);
          const photoURL = await uploadReportPhoto(queuedPhoto, user.uid);

          await createReport(idToken, {
            category: item.category,
            severity: item.severity,
            district: item.district,
            description: item.description,
            latitude: item.latitude,
            longitude: item.longitude,
            photoURL,
            source: "offline-sync",
            capturedAt: item.capturedAt,
          });

          removeQueuedReport(item.id);
          synced += 1;
        } catch (error) {
          console.error(`Queued item ${item.id} failed`, error);
        }
      }

      refreshQueueCount();
      setMessage(`Synced ${synced} queued report${synced === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(errorMessage(error, "Queue sync failed."));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AuthGuard>
      <section className="page capture-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Field Quick Capture</h1>
            <p className="page-subtitle">
              Record incidents in seconds with GPS-first capture and photo proof.
            </p>
          </div>
        </header>

        <section className="panel capture-actions-grid" aria-label="Report type actions">
          {CATEGORY_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`capture-action ${category === item.id ? "active" : ""}`}
              onClick={() => setCategory(item.id)}
            >
              <span className="capture-action-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="capture-action-title">{item.label}</span>
              <span className="capture-action-helper">{item.helper}</span>
            </button>
          ))}
        </section>

        <section className="panel" style={{ display: "grid", gap: "0.8rem" }}>
          <div className="capture-telemetry">
            <p className="stat-label">Active Type</p>
            <p className="stat-value" style={{ fontSize: "1.05rem" }}>
              {selectedCategoryMeta?.label ?? "Unknown"}
            </p>
          </div>

          <div className="capture-telemetry">
            <p className="stat-label">GPS</p>
            <p className="muted" style={{ margin: 0 }}>
              {coords
                ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} � �${coords.accuracy}m`
                : "Waiting for location fix"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={refreshLocation}
              disabled={locating}
            >
              {locating ? "Refreshing GPS..." : "Refresh GPS"}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={syncQueuedReports}
              disabled={syncing || queueCount === 0 || !online}
            >
              {syncing ? "Syncing..." : `Sync Queue (${queueCount})`}
            </button>
          </div>

          <div className="capture-chip-row" role="group" aria-label="Severity">
            {REPORT_SEVERITIES.map((value) => (
              <button
                key={value}
                type="button"
                className={`capture-chip ${severity === value ? "active" : ""}`}
                onClick={() => setSeverity(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <label>
            <span className="muted">District (optional)</span>
            <input
              className="input"
              type="text"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="e.g., Kator"
            />
          </label>

          <label>
            <span className="muted">Quick note (optional)</span>
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short context for moderators"
              maxLength={300}
            />
          </label>

          <label>
            <span className="muted">Photo</span>
            <input
              className="input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                if (event.target.files && event.target.files[0]) {
                  setPhoto(event.target.files[0]);
                }
              }}
            />
          </label>

          <label className="capture-toggle-row">
            <input
              type="checkbox"
              checked={rapidMode}
              onChange={(event) => setRapidMode(event.target.checked)}
            />
            <span>Rapid multi-report mode (stay on this screen after submit)</span>
          </label>

          <button
            type="button"
            className="btn btn-primary capture-submit"
            onClick={handleCapture}
            disabled={submitting || !photo || !coords}
          >
            {submitting ? "Saving report..." : "Capture Incident"}
          </button>

          <p className="muted" style={{ margin: 0 }}>
            Connectivity: {online ? "Online" : "Offline (queue mode)"}
          </p>

          {message && <div className="panel">{message}</div>}
        </section>
      </section>
    </AuthGuard>
  );
}
