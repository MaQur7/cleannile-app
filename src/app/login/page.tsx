"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanEmail.includes("@")) {
        alert("Please enter a valid email address");
        return;
      }

      if (cleanPassword.length < 6) {
        alert("Password must be at least 6 characters");
        return;
      }

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

      console.log("User saved to Firestore");

      router.push("/dashboard"); // moved here (after successful signup)
    } catch (error: any) {
      console.error(error.message);
      alert(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      const user = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );

      console.log("User logged in:", user.user);

      router.push("/dashboard"); // redirect after login
    } catch (error: any) {
      console.error(error.message);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <main style={{ padding: "20px" }}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button type="button" onClick={handleSignup}>
        Sign Up
      </button>

      <button type="button" onClick={handleLogin}>
        Login
      </button>
    </main>
  );
}