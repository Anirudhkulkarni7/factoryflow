"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { createFormDraft } from "@/features/forms/api/formsApi";

import { PlantMultiSelect, type PlantOption } from "@/components/PlantMultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FieldType = "TEXT" | "NUMBER" | "CHECKBOX" | "DROPDOWN" | "DATE" | "PHOTO";

type ParsedField = {
  label: string;
  type: FieldType;
  required: boolean;
  config: null | { options?: string[] };
};

type PlantApi = { id: string; name: string };

export default function ImportFormPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [plantIds, setPlantIds] = useState<string[]>([]);
  const [fields, setFields] = useState<ParsedField[]>([]);
  const [parsing, setParsing] = useState(false);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsIndex, setOptionsIndex] = useState<number | null>(null);
  const [optionsText, setOptionsText] = useState("");

  const router = useRouter();
  const queryClient = useQueryClient();

  const plantsQuery = useQuery({
    queryKey: ["plants"] as const,
    queryFn: async () => {
      const res = await api.get<{ items?: PlantApi[] } | PlantApi[]>(
        "/plants?page=1&limit=200",
      );
      return Array.isArray(res) ? res : res.items ?? [];
    },
  });

  const plantOptions: PlantOption[] = useMemo(
    () => (plantsQuery.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    [plantsQuery.data],
  );

  function updateFieldAt(index: number, next: ParsedField) {
    setFields((prev) => prev.map((f, i) => (i === index ? next : f)));
  }

  function setFieldType(index: number, nextType: FieldType) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;

        if (nextType === "DROPDOWN") {
          const existing = f.config?.options ?? [];
          return { ...f, type: nextType, config: { options: existing } };
        }

        return { ...f, type: nextType, config: null };
      }),
    );
  }

  function toggleRequired(index: number, nextRequired: boolean) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, required: nextRequired } : f)),
    );
  }

  function openOptionsEditor(index: number) {
    const opts = fields[index]?.config?.options ?? [];
    setOptionsIndex(index);
    setOptionsText(opts.join("\n"));
    setOptionsOpen(true);
  }

  function saveOptionsEditor() {
    if (optionsIndex === null) return;

    const opts = optionsText
      .split(/[\n,]/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const current = fields[optionsIndex];
    if (!current) return;

    updateFieldAt(optionsIndex, {
      ...current,
      type: "DROPDOWN",
      config: { options: opts },
    });

    setOptionsOpen(false);
    setOptionsIndex(null);
  }

  async function parseExcel(f: File) {
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found in file");

      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
      });

      const parsed = parseAnyExcel(rows);

      if (parsed.length === 0) {
        throw new Error(
          "No valid rows found. Expected columns like: label, type, required, options",
        );
      }

      setFields(parsed);

      if (!title.trim()) {
        const base = f.name.replace(/\.(xlsx|xls)$/i, "");
        setTitle(base);
      }

      toast.success(`Parsed ${parsed.length} fields`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to parse Excel";
      toast.error(msg);
      setFields([]);
    } finally {
      setParsing(false);
    }
  }

  const canPreview = Boolean(file) && !parsing;
  const canImport =
    title.trim().length > 0 && plantIds.length > 0 && fields.length > 0;

  const importMutation = useMutation({
    mutationFn: async () => {
      return createFormDraft({
        title: title.trim(),
        plantIds,
        fields,
      });
    },
    onSuccess: async (id) => {
      toast.success("Draft created from Excel");
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      router.push(`/forms/${id}`);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Form</h1>
          <p className="text-sm text-muted-foreground">
            Upload an Excel sheet, preview fields, then create a draft.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/forms">Back</Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-background p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Excel file</div>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setFields([]);
                if (f) void parseExcel(f);
              }}
            />
            {file ? (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Form title</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Form title"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Plants</div>
          <PlantMultiSelect
            options={plantOptions}
            value={plantIds}
            onChange={setPlantIds}
            disabled={plantsQuery.isLoading || plantsQuery.isError}
          />
          {plantsQuery.isError ? (
            <p className="text-sm text-red-500">Failed to load plants</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!file) return;
              void parseExcel(file);
            }}
            disabled={!canPreview}
          >
            {parsing ? "Parsing..." : "Re-parse"}
          </Button>

          <Button
            onClick={() => {
              if (!canImport) {
                toast.error("Add title, select plants, and ensure fields are parsed");
                return;
              }
              importMutation.mutate();
            }}
            disabled={!canImport || importMutation.isPending}
          >
            {importMutation.isPending ? "Creating..." : "Create Draft"}
          </Button>

          <div className="text-sm text-muted-foreground">
            {fields.length > 0 ? `${fields.length} fields parsed` : ""}
          </div>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Options</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Upload an Excel file to see preview.
                </TableCell>
              </TableRow>
            ) : (
              fields.map((f, idx) => (
                <TableRow key={`${f.label}_${idx}`} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{f.label}</TableCell>

                  <TableCell>
                    <Select
                      value={f.type}
                      onValueChange={(v) => setFieldType(idx, v as FieldType)}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXT">TEXT</SelectItem>
                        <SelectItem value="NUMBER">NUMBER</SelectItem>
                        <SelectItem value="DATE">DATE</SelectItem>
                        <SelectItem value="CHECKBOX">CHECKBOX</SelectItem>
                        <SelectItem value="DROPDOWN">DROPDOWN</SelectItem>
                        <SelectItem value="PHOTO">PHOTO</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={f.required}
                        onCheckedChange={(v) => toggleRequired(idx, Boolean(v))}
                        id={`req_${idx}`}
                      />
                      <label
                        htmlFor={`req_${idx}`}
                        className="text-sm text-muted-foreground"
                      >
                        Required
                      </label>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {f.type === "DROPDOWN" ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-56">
                          {(f.config?.options ?? []).join(", ") || "No options"}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openOptionsEditor(idx)}
                        >
                          Edit
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Excel expected columns (header row): <span className="font-mono">label</span>,{" "}
        <span className="font-mono">type</span>,{" "}
        <span className="font-mono">required</span> and optional{" "}
        <span className="font-mono">options</span> (comma separated).
      </div>

      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit dropdown options</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter one option per line (or comma-separated).
            </p>

            <Textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              rows={8}
              placeholder={"Option 1\nOption 2\nOption 3"}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOptionsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveOptionsEditor}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseRowToField(row: Record<string, unknown>): ParsedField | null {
  const label = asString(
    pick(row, [
      "label",
      "Label",
      "FIELD",
      "Field",
      "field",
      "question",
      "Question",
    ]),
  ).trim();
  if (!label) return null;

  const typeRaw = asString(pick(row, ["type", "Type", "fieldType", "FieldType"])).trim();
  const type = normalizeType(typeRaw);
  if (!type) return null;

  const reqRaw = pick(row, [
    "required",
    "Required",
    "req",
    "Req",
    "mandatory",
    "Mandatory",
  ]);
  const required = normalizeRequired(reqRaw);

  const optionsRaw = asString(
    pick(row, ["options", "Options", "dropdownOptions", "DropdownOptions"]),
  );

  const options = optionsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const config = type === "DROPDOWN" ? { options } : null;
  return { label, type, required, config };
}

function parseAnyExcel(rows: Record<string, unknown>[]): ParsedField[] {
  if (rows.length === 0) return [];

  const first = rows[0] ?? {};
  const keys = Object.keys(first).map((k) => k.trim());
  const lower = new Set(keys.map((k) => k.toLowerCase()));

  const looksLikeTemplate = lower.has("label") && lower.has("type");

  if (looksLikeTemplate) {
    return rows
      .map(parseRowToField)
      .filter((x): x is ParsedField => x !== null);
  }

  return inferFieldsFromData(rows);
}

const META_COLS = new Set(
  [
    "submission_id",
    "submitted_by",
    "status",
    "created_at",
    "updated_at",
    "approvalsubmission",
    "approval_submission",
    "id",
    "templateid",
    "plantid",
    "familyid",
    "version",
  ].map(normalizeKey),
);

function inferFieldsFromData(rows: Record<string, unknown>[]): ParsedField[] {
  const first = rows[0] ?? {};
  const headers = Object.keys(first)
    .map((h) => h.trim())
    .filter((h) => h.length > 0)
    .filter((h) => !META_COLS.has(normalizeKey(h)));

  const sample = rows.slice(0, 200);

  return headers.map((h) => {
    const values = sample
      .map((r) => asString(r[h]).trim())
      .filter(Boolean);

    const required = values.length / Math.max(1, sample.length) >= 0.95;

    const type = inferType(values);
    const config = type === "DROPDOWN" ? { options: inferOptions(values) } : null;

    return {
      label: humanizeHeader(h),
      type,
      required,
      config,
    };
  });
}

function normalizeKey(s: string) {
  return s.trim().toLowerCase().split(/\s+/).join("_");
}

function humanizeHeader(h: string) {
  const withSpaces = h
    .replaceAll("_", " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function inferType(values: string[]): FieldType {
  if (values.length === 0) return "TEXT";

  const strings = values.map((s) => s.trim()).filter(Boolean);

  const boolLike = strings.every((s) =>
    ["yes", "no", "true", "false", "y", "n", "0", "1"].includes(s.toLowerCase()),
  );
  if (boolLike) return "CHECKBOX";

  const dateLikeCount = strings.filter((s) => isDateLike(s)).length;
  if (dateLikeCount / strings.length >= 0.8) return "DATE";

  const numLikeCount = strings.filter((s) => isNumberLike(s)).length;
  if (numLikeCount / strings.length >= 0.8) return "NUMBER";

  const uniq = unique(strings).slice(0, 50);
  if (uniq.length >= 2 && uniq.length <= 10) return "DROPDOWN";

  return "TEXT";
}

function inferOptions(values: string[]) {
  return unique(values.map((s) => s.trim()).filter(Boolean)).slice(0, 20);
}

function unique(arr: string[]) {
  return Array.from(new Set(arr));
}

function isNumberLike(s: string) {
  return /^-?\d+(\.\d+)?$/.test(s);
}

function isDateLike(s: string) {
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

function pick(obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return "";
}

function asString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString();
  return "";
}

function normalizeRequired(v: unknown) {
  const s = asString(v).trim().toLowerCase();
  if (s === "true" || s === "yes" || s === "y" || s === "1") return true;
  if (s === "false" || s === "no" || s === "n" || s === "0") return false;
  return false;
}

function normalizeType(raw: string): FieldType | null {
  const s = raw.trim().toUpperCase();
  if (s === "TEXT" || s === "STRING") return "TEXT";
  if (s === "NUMBER" || s === "NUM" || s === "INTEGER" || s === "FLOAT") return "NUMBER";
  if (s === "CHECKBOX" || s === "BOOL" || s === "BOOLEAN") return "CHECKBOX";
  if (s === "DROPDOWN" || s === "SELECT") return "DROPDOWN";
  if (s === "DATE") return "DATE";
  if (s === "PHOTO" || s === "IMAGE") return "PHOTO";
  return null;
}