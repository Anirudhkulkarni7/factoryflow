import { getToken } from "@/lib/auth/token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type ApiFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (options?.headers) Object.assign(headers, options.headers);

  const init: RequestInit = options ? { ...options, headers } : { headers };

  const res = await fetch(`${API_BASE_URL}${path}`, init);

  const text = await res.text().catch(() => "");
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    if (isRecord(data)) {
      const m = data["message"];
      const e = data["error"];
      if (typeof m === "string") msg = m;
      else if (typeof e === "string") msg = e;
    }
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}