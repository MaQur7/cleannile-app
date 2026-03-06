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

/**
 * Enhanced category with quick-capture metadata
 */
const CATEGORY_ACTIONS: Array<{
  id: ReportCategory;
  label: string;
  icon: string;
  color: string;
  helper: string;
  quickSeverity: ReportSeverity[];
  suggestedDistricts: string[];
}> = [
  {
    id: "pollution",
    label: "Pollution",
    icon: "💨",
    color: "#ef4444",
    helper: "Air, soil, or industrial contamination",
    quickSeverity: ["medium", "high", "critical"],
    suggestedDistricts: ["Addis Ababa", "Dire Dawa", "Adama"],
  },
  {
    id: "waste",
    label: "Plastic & Waste",
    icon: "♻️",
    color: "#ec4899",
    helper: "Illegal dumping, plastics, debris",
    quickSeverity: ["low", "medium", "high"],
    suggestedDistricts: ["Addis Ababa", "Dire Dawa", "Adama"],
  },
  {
    id: "water",
    label: "Water Risk",
    icon: "💧",
    color: "#3b82f6",
    helper: "Oil, sewage, chemical discharge",
    quickSeverity: ["high", "critical"],
    suggestedDistricts: ["Awash", "Addis Ababa", "Adama"],
  },
];

// Pre-defined quick description templates for rapid capture
const QUICK_TEMPLATES: Record<ReportCategory, string[]> = {
  pollution: [
    "Air quality degradation",
    "Industrial emissions",
    "Dust storm",
    "Chemical smell",
    "Smoke plume",
  ],
  waste: [
    "Plastic bags scattered",
    "Construction debris",
    "Electronic waste",
    "Organic waste pile",
    "Mixed garbage dump",
  ],
  water: [
    "Oil slick visible",
    "Water discoloration",
    "Chemical contamination",
    "Sewage overflow",
    "Fish kill incident",
  ],
};

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

/**
 * Rapid Field Data Capture Interface
 * Optimized for mobile and minimal typing workflows
 */
export default function RapidFieldCapturePage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();

  // Core data
  const [category, setCategory] = useState<ReportCategory>("pollution");
  const [severity, setSeverity] = useState<ReportSeverity>("medium");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Location tracking
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  // UI state
  const [step, setStep] = useState<"capture" | "details" | "review">("capture");
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);

  const selectedCategoryMeta = useMemo(
    () => CATEGORY_ACTIONS.find((item) => item.id === category),
    [category]
  );

  const templates = useMemo(() => QUICK_TEMPLATES[category] || [], [category]);

  // Effects
  useEffect(() => {
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));

    const updateQueueCount = () => {
      setQueueCount(getQueuedReports().length);
    };

    updateQueueCount();
    const interval = setInterval(updateQueueCount, 2000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", () => setOnline(true));
      window.removeEventListener("offline", () => setOnline(false));
    };
  }, []);

  // Auto-refresh location when component mounts
  useEffect(() => {
    refreshLocation();
  }, []);

  // Handlers
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is unavailable in this browser.");
      return;
    }

    setLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords(asCoordinates(position));
        setLocating(false);
      },
      (error) => {
        setMessage(`Location error: ${errorMessage(error, "Unable to determine location")}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handlePhotoCapture = useCallback(
    async (file: File) => {
      setPhoto(file);
      const preview = await fileToDataURL(file);
      setPhotoPreview(preview);
    },
    []
  );

  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const converted = await heic2any({ blob: file });
        const photoFile = converted instanceof Blob ? new File([converted], "photo.jpg", { type: "image/jpeg" }) : file;
        handlePhotoCapture(photoFile);
      } catch {
        handlePhotoCapture(file);
      }
    }
  };

  const handleQuickTemplateClick = (template: string) => {
    if (useTemplate) {
      setDescription(template);
    }
  };

  const submitReport = async () => {
    if (!coords || !photo) {
      setMessage("Location and photo are required");
      return;
    }

    if (!district) {
      setMessage("Please select a district");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      let photoURL = "";

      if (online) {
        const uploadedURL = await uploadReportPhoto(photo);
        photoURL = uploadedURL;
      }

      const reportData = {
        category,
        severity,
        district,
        description,
        photoURL,
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: "field-capture" as const,
        capturedAt: new Date().toISOString(),
      };

      if (online && user) {
        const token = await getIdToken();
        await createReport(reportData, token);
        setMessage("✓ Report submitted successfully!");
      } else {
        enqueueReport(reportData);
        setMessage("✓ Report saved offline. It will sync when connection is available.");
      }

      // Reset form
      setTimeout(() => {
        setStep("capture");
        setCategory("pollution");
        setSeverity("medium");
        setDistrict("");
        setDescription("");
        setPhoto(null);
        setPhotoPreview(null);
        refreshLocation();
      }, 1500);
    } catch (error) {
      setMessage(`Error: ${errorMessage(error, "Failed to submit report")}`);
    } finally {
      setSubmitting(false);
    }
  };

  const syncQueue = async () => {
    if (!online || !user) return;

    setSyncing(true);
    const queued = getQueuedReports();

    try {
      const token = await getIdToken();

      for (const item of queued) {
        await createReport(item.data, token);
        removeQueuedReport(item.id);
      }

      setQueueCount(0);
      setMessage("✓ Queue synced successfully!");
    } catch (error) {
      setMessage(`Sync error: ${errorMessage(error, "Could not sync queue")}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AuthGuard>
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          paddingBottom: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#1e293b",
            color: "white",
            padding: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "20px" }}>🌍 Field Report</h1>
          <div>
            <span style={{ fontSize: "12px", opacity: 0.8 }}>
              {online ? "🟢 Online" : "🔴 Offline"}
            </span>
            {queueCount > 0 && (
              <span
                style={{
                  display: "inline-block",
                  background: "#f97316",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  marginLeft: "8px",
                }}
              >
                {queueCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              margin: "8px",
              borderRadius: "6px",
              fontSize: "14px",
              background: message.includes("✓") ? "#d1fae5" : message.includes("Error") ? "#fee2e2" : "#dbeafe",
              color: message.includes("✓") ? "#047857" : message.includes("Error") ? "#b91c1c" : "#1e40af",
              border: `1px solid ${message.includes("✓") ? "#6ee7b7" : message.includes("Error") ? "#fca5a5" : "#93c5fd"}`,
            }}
          >
            {message}
          </div>
        )}

        {/* Step 1: Capture Category & Photo */}
        {step === "capture" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
            {/* Category Selection */}
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "16px" }}>What's the issue?</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {CATEGORY_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setCategory(action.id)}
                    style={{
                      padding: "12px",
                      border: category === action.id ? `3px solid ${action.color}` : "2px solid #e5e7eb",
                      borderRadius: "8px",
                      background: category === action.id ? `${action.color}15` : "white",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "4px" }}>{action.icon}</div>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture */}
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "16px" }}>📷 Take a Photo</h2>

              {photoPreview ? (
                <div style={{ marginBottom: "12px" }}>
                  <img
                    src={photoPreview}
                    alt="Captured"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "350px",
                      borderRadius: "6px",
                      marginBottom: "12px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#e5e7eb",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Take Different Photo
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: "block",
                    padding: "32px",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "8px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#f1f5f9",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📸</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                    Tap to capture photo
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    This helps verify the incident
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* Location */}
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "16px" }}>📍 Location</h2>
              {coords ? (
                <div style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                  <div>
                    <strong>Coordinates:</strong> {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                  </div>
                  <div style={{ fontSize: "12px" }}>
                    Accuracy: ±{coords.accuracy}m
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Locating...
                </div>
              )}

              <button
                onClick={refreshLocation}
                disabled={locating}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#118ab2",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  opacity: locating ? 0.5 : 1,
                }}
              >
                {locating ? "Locating..." : "🔄 Refresh Location"}
              </button>
            </div>

            {/* Next Button */}
            <button
              onClick={() => setStep("details")}
              disabled={!photo || !coords}
              style={{
                width: "100%",
                padding: "14px",
                background: !photo || !coords ? "#cbd5e1" : "#0f766e",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: !photo || !coords ? "default" : "pointer",
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              Next: Add Details →
            </button>
          </div>
        )}

        {/* Step 2: Add Details */}
        {step === "details" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
            {/* Severity Selection */}
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "16px" }}>How severe?</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                {REPORT_SEVERITIES.map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    style={{
                      padding: "12px",
                      border: severity === sev ? "3px solid #3b82f6" : "2px solid #e5e7eb",
                      borderRadius: "6px",
                      background: severity === sev ? "#dbeafe" : "white",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* District Selection */}
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "16px" }}>Which district?</h2>
              <input
                list="districts"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Select or type district..."
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  marginBottom: "8px",
                }}
              />
              <datalist id="districts">
                {selectedCategoryMeta?.suggestedDistricts.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            {/* Quick Description Templates */}
            {useTemplate && (
              <div
                style={{
                  background: "white",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h2 style={{ margin: 0, fontSize: "16px" }}>Quick Description</h2>
                  <button
                    onClick={() => setUseTemplate(!useTemplate)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      fontSize: "12px",
                      textDecoration: "underline",
                    }}
                  >
                    Write custom
                  </button>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {templates.map((template) => (
                    <button
                      key={template}
                      onClick={() => handleQuickTemplateClick(template)}
                      style={{
                        padding: "8px 12px",
                        background: description === template ? "#0f766e" : "#e5e7eb",
                        color: description === template ? "white" : "#1e293b",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Description */}
            {!useTemplate && (
              <div
                style={{
                  background: "white",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <h2 style={{ marginTop: 0, fontSize: "16px" }}>Description (optional)</h2>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any additional details..."
                  maxLength={500}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    minHeight: "100px",
                    resize: "vertical",
                  }}
                />
                <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                  {description.length}/500
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                onClick={() => setStep("capture")}
                style={{
                  padding: "12px",
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep("review")}
                style={{
                  padding: "12px",
                  background: "#118ab2",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === "review" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "18px" }}>Review Your Report</h2>

              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    objectFit: "cover",
                  }}
                />
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    Category
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600" }}>
                    {selectedCategoryMeta?.label}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    Severity
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600", textTransform: "uppercase" }}>
                    {severity}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    District
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600" }}>
                    {district}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    Accuracy
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600" }}>
                    ±{coords?.accuracy}m
                  </div>
                </div>
              </div>

              {description && (
                <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    Description
                  </div>
                  <div style={{ fontSize: "14px" }}>{description}</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  onClick={() => setStep("details")}
                  disabled={submitting}
                  style={{
                    padding: "12px",
                    background: "#e5e7eb",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  ← Edit
                </button>
                <button
                  onClick={submitReport}
                  disabled={submitting}
                  style={{
                    padding: "12px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? "Submitting..." : "✓ Submit Report"}
                </button>
              </div>
            </div>

            {queueCount > 0 && online && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#92400e",
                }}
              >
                <button
                  onClick={syncQueue}
                  disabled={syncing}
                  style={{
                    background: "#d97706",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    width: "100%",
                    opacity: syncing ? 0.5 : 1,
                  }}
                >
                  {syncing ? "Syncing..." : `Sync ${queueCount} Offline Reports`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

// Import heic2any dynamically to avoid issues
import("heic2any").catch(() => {});
