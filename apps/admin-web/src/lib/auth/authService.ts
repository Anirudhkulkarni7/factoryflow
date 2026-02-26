import { apiFetch } from "@/lib/api/apiFetch";
import { clearToken, setToken } from "./token";
import { decodeJwt, type JwtClaims } from "./jwt";
import { clearSessionUser, setSessionUser } from "./session";

export type LoginInput = {
  email: string;
  password: string;
};

type AnyLoginResponse =
  | { access_token: string }
  | { accessToken: string }
  | { token: string }
  | { data: { access_token?: string; accessToken?: string; token?: string } }
  | Record<string, any>;

function extractToken(res: AnyLoginResponse): string | null {
  const direct =
    (res as any)?.access_token ??
    (res as any)?.accessToken ??
    (res as any)?.token;

  const nested =
    (res as any)?.data?.access_token ??
    (res as any)?.data?.accessToken ??
    (res as any)?.data?.token;

  return (direct ?? nested ?? null) as string | null;
}

export const authService = {
  async login(input: LoginInput): Promise<JwtClaims> {
    const res = await apiFetch<AnyLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const token = extractToken(res);
    if (!token) throw new Error("Login succeeded but token not found in response.");

    setToken(token);
    setSessionUser({ email: input.email });

    return decodeJwt(token) ?? {};
  },

  logout() {
    clearSessionUser();
    clearToken();
  },
};