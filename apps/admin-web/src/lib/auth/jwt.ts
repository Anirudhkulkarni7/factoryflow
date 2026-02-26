export type JwtClaims = {
  sub?: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  plantIds?: string[];
  exp?: number;
  iat?: number;
  [k: string]: unknown;
};

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          const cp = c.codePointAt(0) ?? 0;
          return "%" + ("00" + cp.toString(16)).slice(-2);
        })
        .join(""),
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}
