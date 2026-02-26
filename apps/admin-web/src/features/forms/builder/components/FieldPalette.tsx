"use client";

import type { FieldType } from "../types";
import { Button } from "@/components/ui/button";

type FieldPaletteProps = Readonly<{
  onAdd: (type: FieldType) => void;
}>;

const ITEMS: Array<{ type: FieldType; label: string }> = [
  { type: "TEXT", label: "Text" },
  { type: "NUMBER", label: "Number" },
  { type: "CHECKBOX", label: "Checkbox" },
  { type: "DROPDOWN", label: "Dropdown" },
  { type: "DATE", label: "Date" },
  { type: "PHOTO", label: "Photo" },
];

export function FieldPalette({ onAdd }: FieldPaletteProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Fields</div>
      <div className="grid gap-2">
        {ITEMS.map((i) => (
          <Button
            key={i.type}
            variant="outline"
            className="justify-start"
            onClick={() => onAdd(i.type)}
          >
            + {i.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Add a field, then drag to reorder.
      </p>
    </div>
  );
}