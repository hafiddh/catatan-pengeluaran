// lib/client/auth-context.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

const AuthContext = createContext<{ user: AuthUser | null } | undefined>(
  undefined,
);

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
