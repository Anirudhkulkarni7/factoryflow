export type ApiClientOptions = {
  baseUrl: string;
  getToken?: () => string | null;
};

export function createApiClient(opts: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const token = opts.getToken?.();
    const res = await fetch(`${opts.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });

    const text = await res.text().catch(() => "");
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const msg = (data as any)?.message ?? `Request failed (${res.status})`;
      throw new Error(Array.isArray(msg) ? msg.join(", ") : String(msg));
    }
    return data as T;
  }

  return {
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    get: <T>(path: string) => request<T>(path, { method: "GET" }),
  };
}