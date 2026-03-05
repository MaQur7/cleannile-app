"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import { useAuth } from "../../../components/providers/AuthProvider";
import {
  createReport,
  uploadReportPhoto,
} from "../../../lib/report-submit";
import {
  REPORT_SEVERITIES,
  reportCategorySchema,
  reportSeveritySchema,
} from "../../../lib/schemas";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function NewReportPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();

  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("pollution");
  const [severity, setSeverity] = useState("medium");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async () => {
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    if (!photo) {
      alert("Please upload a photo.");
      return;
    }

    const parsedCategory = reportCategorySchema.safeParse(category);
    if (!parsedCategory.success) {
      alert("Invalid report category.");
      return;
    }

    const parsedSeverity = reportSeveritySchema.safeParse(severity);
    if (!parsedSeverity.success) {
      alert("Invalid report severity.");
      return;
    }

    setLoading(true);

    try {
      const photoURL = await uploadReportPhoto(photo, user.uid);
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error("Unable to verify session. Please sign in again.");
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            await createReport(idToken, {
              category: parsedCategory.data,
              severity: parsedSeverity.data,
              district: district.trim(),
              description,
              photoURL,
              latitude,
              longitude,
              source: "web-form",
              capturedAt: new Date().toISOString(),
            });

            setDescription("");
            setDistrict("");
            setCategory("pollution");
            setSeverity("medium");
            setPhoto(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }

            router.replace("/dashboard");
          } catch (error) {
            console.error("Report submission error:", error);
            alert(errorMessage(error, "Unable to submit report."));
          } finally {
            setLoading(false);
          }
        },
        (error: GeolocationPositionError) => {
          console.error("Location error:", error);
          alert("Location permission denied.");
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      alert(errorMessage(error, "Unable to upload photo."));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Submit Environmental Report</h1>
            <p className="page-subtitle">
              Share precise details and media to help moderators validate field conditions quickly.
            </p>
          </div>
        </header>

        <div className="panel" style={{ maxWidth: "700px" }}>
          <div className="form-grid">
            <label>
              <span className="muted">Issue category</span>
              <select
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="pollution">Pollution</option>
                <option value="waste">Waste Dumping</option>
                <option value="water">Water Contamination</option>
              </select>
            </label>

            <label>
              <span className="muted">Severity</span>
              <select
                className="select"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
              >
                {REPORT_SEVERITIES.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </label>

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
              <span className="muted">Description</span>
              <textarea
                className="textarea"
                placeholder="Describe what happened and why it matters"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label>
              <span className="muted">Photo evidence</span>
              <input
                ref={fileInputRef}
                className="input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  if (event.target.files) {
                    setPhoto(event.target.files[0]);
                  }
                }}
              />
            </label>

            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting report..." : "Submit report"}
            </button>
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}
