"use client";
import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

import { useRouter } from "next/navigation";


import { useState } from "react";
import { auth } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleSignup = async () => {
  try {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    router.push("/dashboard");

if (!email.trim() || !email.includes("@")) {
  alert("Please enter a valid email address");
  return;
}

if (password.trim().length < 6) {
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
      role: "user",   // 👈 ADD THIS
    });

    console.log("User saved to Firestore");
  } catch (error: any) {
    console.error(error.message);
  }
};

const router = useRouter();

  const handleLogin = async () => {
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in:", user.user);
    } catch (error: any) {
      console.error(error.message);
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