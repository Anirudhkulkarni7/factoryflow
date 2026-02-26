"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormFieldDraft } from "../types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type FieldConfigPanelProps = Readonly<{
  field: FormFieldDraft | null;
  onChange: (next: FormFieldDraft) => void;
}>;

export function FieldConfigPanel({ field, onChange }: FieldConfigPanelProps) {
  const [dropdownRaw, setDropdownRaw] = useState("");

  useEffect(() => {
    if (field?.type !== "DROPDOWN") return;
    const initial = (field.config?.options ?? []).join("\n");
    setDropdownRaw(initial);
  }, [field?.id, field?.type]);

  const requiredId = useMemo(
    () => (field ? `required_${field.id}` : "required"),
    [field],
  );

  if (!field) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Config</div>
        <p className="text-sm text-muted-foreground">Select a field to edit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">Config</div>
        <div className="text-xs text-muted-foreground">{field.type}</div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`label_${field.id}`} className="text-sm">
          Label
        </label>
        <Input
          id={`label_${field.id}`}
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={requiredId}
          checked={field.required}
          onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })}
        />
        <label htmlFor={requiredId} className="text-sm">
          Required
        </label>
      </div>

      {field.type === "DROPDOWN" ? (
        <div className="space-y-2">
          <label htmlFor={`options_${field.id}`} className="text-sm">
            Options (one per line)
          </label>

          <Textarea
            id={`options_${field.id}`}
            value={dropdownRaw}
            placeholder={"Option 1\nOption 2\nOption 3"}
            rows={8}
            onChange={(e) => {
              const raw = e.target.value;
              setDropdownRaw(raw);

              const nextOptions = raw
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

              onChange({
                ...field,
                config: { options: nextOptions },
              });
            }}
            onBlur={() => {
              // optional: normalize display when leaving field
              const normalized = dropdownRaw
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
                .join("\n");
              setDropdownRaw(normalized);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}