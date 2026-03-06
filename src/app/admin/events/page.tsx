"use client";

import { useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { useAuth } from "../../../components/providers/AuthProvider";

interface CreateEventForm {
  title: string;
  description: string;
  date: string;
  district: string;
  maxVolunteers: string;
  latitude: string;
  longitude: string;
}

const DISTRICTS = [
  "Cairo - Central",
  "Cairo - East",
  "Cairo - West",
  "Cairo - North",
  "Cairo - South",
  "Giza",
  "Qalyubia",
  "Menoufia",
  "Dakahlia",
  "Sharqia",
];

export default function AdminEventsPage() {
  const { getIdToken } = useAuth();

  const [form, setForm] = useState<CreateEventForm>({
    title: "",
    description: "",
    date: "",
    district: "Cairo - Central",
    maxVolunteers: "",
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = await getIdToken();

      const eventData = {
        title: form.title,
        description: form.description,
        date: form.date,
        district: form.district,
        maxVolunteers: form.maxVolunteers ? parseInt(form.maxVolunteers) : null,
        location:
          form.latitude && form.longitude
            ? {
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
              }
            : null,
      };

      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create event");
      }

      const result = await response.json();
      setMessage(
        `Event "${result.title}" created successfully! Notifications sent to users.`
      );

      // Reset form
      setForm({
        title: "",
        description: "",
        date: "",
        district: "Cairo - Central",
        maxVolunteers: "",
        latitude: "",
        longitude: "",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errorMsg);
      console.error("Error creating event:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Create Cleanup Event</h1>
            <p className="page-subtitle">
              Plan and schedule community cleanup events. Notifications will be
              sent to all users.
            </p>
          </div>
        </header>

        {message && (
          <div
            className="alert"
            style={{
              background: "#d4edda",
              color: "#155724",
              padding: "1rem",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            className="alert"
            style={{
              background: "#f8d7da",
              color: "#721c24",
              padding: "1rem",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "600px" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="title"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              Event Title <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="e.g., Nile River Cleanup Drive"
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="description"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              Description <span style={{ color: "red" }}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Details about the event, tasks, what to bring, etc."
              required
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="date"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              Event Date <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={form.date}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="district"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              District <span style={{ color: "red" }}>*</span>
            </label>
            <select
              id="district"
              name="district"
              value={form.district}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="maxVolunteers"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              Max Volunteers (Optional)
            </label>
            <input
              type="number"
              id="maxVolunteers"
              name="maxVolunteers"
              value={form.maxVolunteers}
              onChange={handleInputChange}
              placeholder="Leave empty for unlimited"
              min="1"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: "500", display: "block", marginBottom: "0.5rem" }}>
              Event Location (Optional)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  htmlFor="latitude"
                  style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
                >
                  Latitude
                </label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleInputChange}
                  placeholder="e.g., 30.0444"
                  step="0.0001"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="longitude"
                  style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
                >
                  Longitude
                </label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleInputChange}
                  placeholder="e.g., 31.2357"
                  step="0.0001"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#666",
                marginTop: "0.5rem",
              }}
            >
              You can also set the location to direct volunteers to the event site.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.85rem",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating Event..." : "Create Event & Send Notifications"}
          </button>
        </form>
      </section>
    </AdminGuard>
  );
}
