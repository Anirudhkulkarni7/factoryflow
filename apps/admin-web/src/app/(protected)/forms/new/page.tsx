"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { FormFieldDraft, FieldType } from "@/features/forms/builder/types";
import { defaultFieldFor, withRecomputedOrder } from "@/features/forms/builder/utils";
import { createFormDraft } from "@/features/forms/api/formsApi";

import { FieldPalette } from "@/features/forms/builder/components/FieldPalette";
import { FormCanvas } from "@/features/forms/builder/components/FormCanvas";
import { FieldConfigPanel } from "@/features/forms/builder/components/FieldConfigPanel";
import { FormPreviewSheet } from "@/features/forms/builder/components/FormPreviewSheet";

import { PlantMultiSelect, type PlantOption } from "@/components/PlantMultiSelect";
import { api } from "@/lib/api";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PlantApi = { id: string; name: string };

export default function NewFormPage() {
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<FormFieldDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [plantIds, setPlantIds] = useState<string[]>([]);

  const router = useRouter();
  const queryClient = useQueryClient();

  // 1) Fetch plants
  const plantsQuery = useQuery({
    queryKey: ["plants"] as const,
    queryFn: async () => {
      // works if backend returns either {items:[...]} or [...]
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

  const canSave = title.trim().length > 0 && fields.length > 0 && plantIds.length > 0;

  // 2) Save draft
  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedFields = withRecomputedOrder(fields).map((f) => ({
        label: f.label.trim() || "Untitled",
        type: f.type,
        required: f.required,
        config: f.type === "DROPDOWN" ? { options: f.config?.options ?? [] } : null,
      }));

      return createFormDraft({
        title: title.trim(),
        plantIds, // send selected plants
        fields: normalizedFields,
      });
    },
    onSuccess: async (id) => {
      toast.success("Draft created");
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      router.push(`/forms/${id}`);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to save draft";
      toast.error(msg);
    },
  });

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedId) ?? null,
    [fields, selectedId],
  );

  function addField(type: FieldType) {
    const base = defaultFieldFor(type);
    const next = withRecomputedOrder([...fields, { ...base, order: fields.length + 1 }]);
    setFields(next);
    setSelectedId(base.id);
  }

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
    setSelectedId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Create Form</h1>

          <div className="max-w-md space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Form title (e.g., Safety Checklist)"
            />

            {/* Plant selector UI */}
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
              {plantOptions.length === 0 && !plantsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  No plants found. Create plants first.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={removeSelected} disabled={!selectedId}>
            Remove Field
          </Button>

          <Button
            onClick={() => {
              if (!canSave) {
                toast.error("Add title, select at least 1 plant, and add at least 1 field");
                return;
              }
              saveMutation.mutate();
            }}
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={fields.length === 0}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* Builder layout */}
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