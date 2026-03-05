"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useAuth } from "../../components/providers/AuthProvider";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  const handleAuth = async () => {
    try {
      setSubmitting(true);
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanEmail.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      if (cleanPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          cleanPassword
        );

        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: userCredential.user.email ?? "",
          joinedAt: new Date(),
          role: "user",
        });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      }

      router.replace("/dashboard");
    } catch (error) {
      const message = errorMessage(
        error,
        mode === "signup" ? "Sign up failed" : "Login failed"
      );
      console.error(message);
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page" style={{ minHeight: "70vh", placeContent: "center" }}>
      <div className="panel" style={{ maxWidth: "460px", margin: "0 auto", width: "100%" }}>
        <header className="page-header" style={{ alignItems: "start" }}>
          <div>
            <h1 className="page-title" style={{ fontSize: "1.7rem" }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="page-subtitle">
              Access reporting workflows, moderation tools, and map analytics.
            </p>
          </div>
        </header>

        <div className="form-grid">
          <label>
            <span className="muted">Email</span>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            <span className="muted">Password</span>
            <input
              className="input"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button type="button" className="btn btn-primary" onClick={handleAuth} disabled={submitting}>
            {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>

        <div style={{ marginTop: "0.9rem" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMode((current) => (current === "login" ? "signup" : "login"))}
            disabled={submitting}
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </section>
  );
}
