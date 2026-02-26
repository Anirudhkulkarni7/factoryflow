"use client";

import { useMemo, useState } from "react";

import type { FormFieldDraft, FieldType } from "@/features/forms/builder/types";
import {
  defaultFieldFor,
  withRecomputedOrder,
} from "@/features/forms/builder/utils";

import { FieldPalette } from "@/features/forms/builder/components/FieldPalette";
import { FormCanvas } from "@/features/forms/builder/components/FormCanvas";
import { FieldConfigPanel } from "@/features/forms/builder/components/FieldConfigPanel";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormPreviewSheet } from "@/features/forms/builder/components/FormPreviewSheet";

export default function NewFormPage() {
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<FormFieldDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedId) ?? null,
    [fields, selectedId],
  );

  function addField(type: FieldType) {
    const base = defaultFieldFor(type);
    const next = withRecomputedOrder([
      ...fields,
      { ...base, order: fields.length + 1 },
    ]);
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
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create Form</h1>
          <div className="max-w-md">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Form title (e.g., Safety Checklist)"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={removeSelected}
            disabled={!selectedId}
          >
            Remove Field
          </Button>

          <Button disabled={title.trim().length === 0 || fields.length === 0}>
            Save Draft
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
