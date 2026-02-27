"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { FormFieldDraft } from "@/features/forms/builder/types";
import {
  withRecomputedOrder,
  defaultFieldFor,
} from "@/features/forms/builder/utils";
import { api } from "@/lib/api";
import { apiFetch } from "@/lib/api/apiFetch";

import { FieldPalette } from "@/features/forms/builder/components/FieldPalette";
import { FormCanvas } from "@/features/forms/builder/components/FormCanvas";
import { FieldConfigPanel } from "@/features/forms/builder/components/FieldConfigPanel";
import { FormPreviewSheet } from "@/features/forms/builder/components/FormPreviewSheet";

import {
  PlantMultiSelect,
  type PlantOption,
} from "@/components/PlantMultiSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PlantApi = { id: string; name: string };

type FieldType = "TEXT" | "NUMBER" | "CHECKBOX" | "DROPDOWN" | "DATE" | "PHOTO";

type ApiField = {
  id: string;
  templateId: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  config: null | { options?: string[] };
};

type FormDetail = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  plantIds: string[];
  fields: ApiField[];
};

export default function EditFormPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [plantIds, setPlantIds] = useState<string[]>([]);
  const [fields, setFields] = useState<FormFieldDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // fetch form detail
  const formQuery = useQuery({
    queryKey: ["form", id] as const,
    queryFn: () => api.get<FormDetail>(`/forms/${id}`),
    enabled: Boolean(id),
  });

  // fetch plants for selector
  const plantsQuery = useQuery({
    queryKey: ["plants"] as const,
    queryFn: async () => {
      const res = await api.get<{ items?: PlantApi[] } | PlantApi[]>(
        "/plants?page=1&limit=200",
      );
      return Array.isArray(res) ? res : (res.items ?? []);
    },
  });

  const plantOptions: PlantOption[] = useMemo(
    () => (plantsQuery.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    [plantsQuery.data],
  );

  // hydrate local state once the form loads
  useEffect(() => {
    const d = formQuery.data;
    if (!d) return;

    setTitle(d.title ?? "");
    setPlantIds(d.plantIds ?? []);

    const draftFields: FormFieldDraft[] = (d.fields ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((f) => ({
        id: f.id, // keep existing ids
        label: f.label,
        type: f.type,
        required: f.required,
        order: f.order,
        config:
          f.type === "DROPDOWN" ? { options: f.config?.options ?? [] } : null,
      }));

    setFields(withRecomputedOrder(draftFields));
    setSelectedId(draftFields.length ? draftFields[0]!.id : null);
  }, [formQuery.data]);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedId) ?? null,
    [fields, selectedId],
  );

  const canSave =
    title.trim().length > 0 && fields.length > 0 && plantIds.length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedFields = withRecomputedOrder(fields).map((f) => ({
        label: f.label.trim() || "Untitled",
        type: f.type,
        required: f.required,
        config:
          f.type === "DROPDOWN" ? { options: f.config?.options ?? [] } : null,
      }));

      await apiFetch(`/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          plantIds,
          fields: normalizedFields,
        }),
      });

      return id;
    },
    onSuccess: async () => {
      toast.success("Draft updated");
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      await queryClient.invalidateQueries({ queryKey: ["form", id] });
      router.push(`/forms/${id}`);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to update draft";
      toast.error(msg);
    },
  });

  function reorder(next: FormFieldDraft[]) {
    setFields(withRecomputedOrder(next));
  }

  function updateField(next: FormFieldDraft) {
    setFields((prev) => prev.map((f) => (f.id === next.id ? next : f)));
  }

  function removeSelected() {
    if (!selectedId) return;
    const next = fields.filter((f) => f.id !== selectedId);
    setFields(withRecomputedOrder(next));
    setSelectedId(next.length ? next[0]!.id : null);
  }

  function addField(type: FieldType) {
    const base = defaultFieldFor(type);
    const next = withRecomputedOrder([
      ...fields,
      { ...base, order: fields.length + 1 },
    ]);
    setFields(next);
    setSelectedId(base.id);
  }

  if (formQuery.isLoading)
    return <div className="text-sm text-muted-foreground">Loading...</div>;

  if (formQuery.isError)
    return (
      <div className="text-sm text-red-500">
        {(formQuery.error as any)?.message ?? "Failed to load form"}
      </div>
    );

  if (formQuery.data?.status !== "DRAFT") {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Only DRAFT forms can be edited.
        </div>
        <Button asChild variant="outline">
          <Link href={`/forms/${id}`}>Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Edit Draft</h1>

          <div className="max-w-md space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="space-y-2">
              <div className="text-sm font-medium">Plants</div>
              <PlantMultiSelect
                options={plantOptions}
                value={plantIds}
                onChange={setPlantIds}
                disabled={plantsQuery.isLoading || plantsQuery.isError}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/forms/${id}`}>Cancel</Link>
          </Button>

          <Button
            variant="outline"
            onClick={removeSelected}
            disabled={!selectedId}
          >
            Remove Field
          </Button>

          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={fields.length === 0}
          >
            Preview
          </Button>

          <Button
            onClick={() => {
              if (!canSave) {
                toast.error(
                  "Add title, select at least 1 plant, and add at least 1 field",
                );
                return;
              }
              saveMutation.mutate();
            }}
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <div className="rounded-lg border bg-background p-4">
          <FieldPalette onAdd={addField} />
        </div>

        <div className="rounded-lg border bg-background p-4">
          <FormCanvas
            fields={fields}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={reorder}
          />
        </div>

        <div className="rounded-lg border bg-background p-4">
          <FieldConfigPanel field={selectedField} onChange={updateField} />
        </div>
      </div>

      <FormPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        fields={fields}
      />
    </div>
  );
}
