import { jwtDecode } from "jwt-decode";
import type { AuthUser, UserRole } from "./types";

type JwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  username?: string;
  role?: UserRole;
  plantIds?: string[];
};

export function decodeAuthUser(token: string): AuthUser {
  const p = jwtDecode<JwtPayload>(token);

  return {
    sub: String(p.sub ?? ""),
    email: p.email,
    name: p.name ?? p.username,
    role: (p.role ?? "USER") as UserRole,
    plantIds: Array.isArray(p.plantIds) ? p.plantIds : undefined,
  };
}