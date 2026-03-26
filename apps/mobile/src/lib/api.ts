const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super("API error");
    this.status = status;
    this.payload = payload;
  }
}

async function safeReadJson(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const p: any = err.payload;
    if (typeof p === "string") return p;
    if (p?.message)
      return Array.isArray(p.message) ? p.message.join("\n") : String(p.message);
    return `Request failed (${err.status})`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as any),
  };

  if (init?.token) headers.Authorization = `Bearer ${init.token}`;
  if (init?.body && !headers["Content-Type"])
    headers["Content-Type"] = "application/json";

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const payload = await safeReadJson(res);
    throw new ApiError(res.status, payload);
  }
  return (await safeReadJson(res)) as T;
}