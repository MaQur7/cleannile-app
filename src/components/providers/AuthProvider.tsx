"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { normalizeUserDoc, type UserRole } from "../../lib/schemas";

type AuthContextValue = {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isRole(value: string | null): value is UserRole {
  return value === "admin" || value === "user";
}

function cacheKey(uid: string) {
  return `cleannile-role:${uid}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let cancelled = false;

    void setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence setup failed:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!nextUser) {
        if (!cancelled) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;

      setUser(nextUser);
      setLoading(true);

      const cachedRoleRaw = window.localStorage.getItem(cacheKey(nextUser.uid));
      const cachedRole = isRole(cachedRoleRaw) ? cachedRoleRaw : null;

      if (cachedRole) {
        setRole(cachedRole);
        setLoading(false);
      }

      let claimRole: UserRole | null = null;

      try {
        const tokenResult = await nextUser.getIdTokenResult();
        if (tokenResult.claims.admin === true) {
          claimRole = "admin";
          if (!cancelled) {
            setRole("admin");
            setLoading(false);
            window.localStorage.setItem(cacheKey(nextUser.uid), "admin");
          }
        }
      } catch (error) {
        console.error("Failed to resolve auth claims:", error);
      }

      unsubscribeUserDoc = onSnapshot(
        doc(db, "users", nextUser.uid),
        (snapshot) => {
          if (cancelled) return;

          if (!snapshot.exists()) {
            const fallbackRole = claimRole ?? cachedRole ?? "user";
            setRole(fallbackRole);
            setLoading(false);
            window.localStorage.setItem(cacheKey(nextUser.uid), fallbackRole);
            return;
          }

          const userDoc = normalizeUserDoc(snapshot.id, snapshot.data());
          const resolvedRole = claimRole === "admin" ? "admin" : userDoc.role;
          setRole(resolvedRole);
          setLoading(false);
          window.localStorage.setItem(cacheKey(nextUser.uid), resolvedRole);
        },
        (error) => {
          console.error("Failed to load user role document:", error);
          if (!cancelled) {
            const fallbackRole = claimRole ?? cachedRole ?? "user";
            setRole(fallbackRole);
            setLoading(false);
            window.localStorage.setItem(cacheKey(nextUser.uid), fallbackRole);
          }
        }
      );
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  const signOutUser = useCallback(async () => {
    if (auth.currentUser) {
      window.localStorage.removeItem(cacheKey(auth.currentUser.uid));
    }
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) {
      return null;
    }

    return auth.currentUser.getIdToken();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      isAdmin: role === "admin",
      isAuthenticated: user != null,
      signOutUser,
      getIdToken,
    }),
    [getIdToken, loading, role, signOutUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
