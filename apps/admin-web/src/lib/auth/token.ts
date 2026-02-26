const TOKEN_KEY = "ff_admin_token";

function getBrowserWindow(): Window | null {
  return typeof globalThis !== "undefined" && "window" in globalThis
    ? (globalThis.window as Window)
    : null;
}

export function getToken(): string | null {
  const w = getBrowserWindow();
  if (!w) return null;
  try {
    return w.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  const w = getBrowserWindow();
  if (!w) return;
  w.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  const w = getBrowserWindow();
  if (!w) return;
  w.localStorage.removeItem(TOKEN_KEY);
}