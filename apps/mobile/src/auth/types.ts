export type UserRole = "ADMIN" | "MANAGER" | "USER";

export type AuthUser = {
  sub: string;
  email?: string;
  name?: string;
  role: UserRole;
  plantIds?: string[];
};

export type LoginResponse = {
  accessToken: string;
};