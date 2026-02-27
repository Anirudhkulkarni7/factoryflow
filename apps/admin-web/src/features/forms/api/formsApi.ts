import { apiFetch } from "@/lib/api/apiFetch";
import type { FieldType } from "@/features/forms/builder/types";

export type CreateFormFieldInput = Readonly<{
  label: string;
  type: FieldType;
  required: boolean;
  config: null | { options?: string[] };
}>;

export type CreateFormInput = Readonly<{
  title: string;
  plantIds: string[];
  fields: CreateFormFieldInput[];
}>;

type AnyCreateResponse = Record<string, unknown>;

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

export async function createFormDraft(input: CreateFormInput): Promise<string> {
  const res = await apiFetch<AnyCreateResponse>("/forms", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const id = extractId(res);
  if (!id) throw new Error("Created form but could not read id from response");
  return id;
}