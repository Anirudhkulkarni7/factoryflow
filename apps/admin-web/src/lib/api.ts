import { createApiClient } from "@factoryflow/api-client";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

function getBrowserWindow(): Window | null {
  return typeof globalThis !== "undefined" && "window" in globalThis
    ? (globalThis.window as Window)
    : null;
}

export const api = createApiClient({
  baseUrl,
  getToken: () => {
    const w = getBrowserWindow();
    if (!w) return null;
    return w.localStorage.getItem("ff_admin_token");
  },
});