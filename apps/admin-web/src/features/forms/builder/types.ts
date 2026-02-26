export type FieldType = "TEXT" | "NUMBER" | "CHECKBOX" | "DROPDOWN" | "DATE" | "PHOTO";

export type FieldConfig = null | { options?: string[] };

export type FormFieldDraft = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  config: FieldConfig;
};

export type FormDraft = {
  title: string;
  plantIds: string[];
  fields: FormFieldDraft[];
};