import { apiFetch } from "@/lib/api/apiFetch";

type AnyResponse = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractId(res: unknown): string | null {
  if (!isRecord(res)) return null;
  const direct = res["id"];
  if (typeof direct === "string") return direct;

  const data = res["data"];
  if (isRecord(data)) {
    const nested = data["id"];
    if (typeof nested === "string") return nested;
  }
  return null;
}

export async function publishForm(id: string): Promise<void> {
  await apiFetch(`/forms/${id}/publish`, { method: "POST" });
}

export async function archiveForm(id: string): Promise<void> {
  await apiFetch(`/forms/${id}/archive`, { method: "POST" });
}

export async function cloneForm(id: string): Promise<string> {
  const res = await apiFetch<AnyResponse>(`/forms/${id}/clone`, { method: "POST" });
  const newId = extractId(res);
  if (!newId) throw new Error("Clone succeeded but could not read new id");
  return newId;
}