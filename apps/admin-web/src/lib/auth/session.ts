const USER_KEY = "ff_admin_user";

export type SessionUser = {
  email?: string;
};

function getBrowserWindow(): Window | null {
  return typeof globalThis !== "undefined" && "window" in globalThis
    ? (globalThis.window as Window)
    : null;
}

export function setSessionUser(user: SessionUser) {
  const w = getBrowserWindow();
  if (!w) return;
  w.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSessionUser(): SessionUser | null {
  const w = getBrowserWindow();
  if (!w) return null;

  const raw = w.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSessionUser() {
  const w = getBrowserWindow();
  if (!w) return;
  w.localStorage.removeItem(USER_KEY);
}