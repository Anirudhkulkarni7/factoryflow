import type { FieldType, FormFieldDraft } from "./types";

export function createId() {
  const w =
    typeof globalThis !== "undefined" && "crypto" in globalThis
      ? (globalThis.crypto as Crypto)
      : null;

  if (w && "randomUUID" in w) return (w.randomUUID as () => string)();
  return `tmp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function defaultFieldFor(type: FieldType): Omit<FormFieldDraft, "order"> {
  switch (type) {
    case "TEXT":
      return { id: createId(), type, label: "Text", required: false, config: null };
    case "NUMBER":
      return { id: createId(), type, label: "Number", required: false, config: null };
    case "CHECKBOX":
      return { id: createId(), type, label: "Checkbox", required: false, config: null };
    case "DATE":
      return { id: createId(), type, label: "Date", required: false, config: null };
    case "PHOTO":
      return { id: createId(), type, label: "Photo", required: false, config: null };
    case "DROPDOWN":
      return {
        id: createId(),
        type,
        label: "Dropdown",
        required: false,
        config: { options: ["Option 1", "Option 2"] },
      };
  }
}

export function withRecomputedOrder(fields: FormFieldDraft[]) {
  return fields.map((f, idx) => ({ ...f, order: idx + 1 }));
}