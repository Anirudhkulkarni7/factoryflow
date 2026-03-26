import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser, LoginResponse } from "./types";
import { apiFetch, getApiErrorMessage } from "../lib/api";
import { clearToken, getToken, setToken } from "./token";
import { decodeAuthUser } from "./jwt";

type AuthState =
  | { status: "loading"; token: null; user: null }
  | { status: "signedOut"; token: null; user: null }
  | { status: "signedIn"; token: string; user: AuthUser };

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", token: null, user: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const token = await getToken();
      if (!token) {
        setState({ status: "signedOut", token: null, user: null });
        return;
      }
      try {
        const user = decodeAuthUser(token);
        setState({ status: "signedIn", token, user });
      } catch {
        await clearToken();
        setState({ status: "signedOut", token: null, user: null });
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = res.accessToken;
      const user = decodeAuthUser(token);

      await setToken(token);
      setState({ status: "signedIn", token, user });
    } catch (e) {
      setError(getApiErrorMessage(e));
      return ;
    }
  };

  const signOut = async () => {
    setError(null);
    await clearToken();
    setState({ status: "signedOut", token: null, user: null });
  };

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, error, clearError: () => setError(null) }),
    [state, error]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}