"use client";

import { useState } from "react";
import { auth } from "../../../lib/firebase";
import { db, storage } from "../../../lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewReportPage() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("pollution");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in.");
      return;
    }

    if (!photo) {
      alert("Please upload a photo.");
      return;
    }

    setLoading(true);

    try {
      const photoRef = ref(storage, `reports/${Date.now()}-${photo.name}`);
      await uploadBytes(photoRef, photo);

      const photoURL = await getDownloadURL(photoRef);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            await fetch("/api/reports", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                category,
                description,
                photoURL,
                latitude,
                longitude,
                userId: auth.currentUser?.uid,
              }),
            });

            alert("Report submitted successfully!");

            setDescription("");
            setCategory("pollution");
            setPhoto(null);

            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }

            setLoading(false);
          } catch (error: any) {
            console.error("Firestore error full:", error);
            alert("Firestore error: " + error.message);
            setLoading(false);
          }
        },

        // FIXED ERROR CALLBACK
        (error: GeolocationPositionError) => {
          console.error("Location error:", error);
          alert("Location permission denied.");
          setLoading(false);
        }
      );
    } catch (error: any) {
      console.error("Upload error:", error.message);
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "20px" }}>
      <h1>Submit a Report</h1>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="pollution">Pollution</option>
        <option value="waste">Waste Dumping</option>
        <option value="water">Water Contamination</option>
      </select>

      <br /><br />

      <textarea
        placeholder="Describe the issue"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <br /><br />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files) {
            setPhoto(e.target.files[0]);
          }
        }}
      />

      <br /><br />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting..." : "Submit Report"}
      </button>
    </main>
  );
}