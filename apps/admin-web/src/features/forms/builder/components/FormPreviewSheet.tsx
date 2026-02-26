"use client";

import type { FormFieldDraft } from "../types";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormPreviewSheetProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormFieldDraft[];
}>;

export function FormPreviewSheet({
  open,
  onOpenChange,
  title,
  fields,
}: FormPreviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl h-dvh overflow-hidden p-0">
        <SheetHeader>
          <SheetTitle>Preview</SheetTitle>
        </SheetHeader>

<div className="mt-2">
          {/* Phone preview only */}
  <div className="mx-auto w-full max-w-97.5 overflow-hidden rounded-[28px] border bg-background shadow-sm">            {/* Fake phone header */}
            <div className="flex items-center justify-center border-b px-4 py-3">
              <div className="h-1.5 w-16 rounded-full bg-muted" />
            </div>

            {/* Title inside phone (less wasted space) */}
            <div className="border-b px-4 py-3">
              <div className="text-xs text-muted-foreground">Preview</div>
              <div className="text-base font-semibold leading-tight">
                {title.trim() ? title.trim() : "Untitled Form"}
              </div>
            </div>

            {/* Scrollable phone content */}
            <div className="space-y-4 p-4 max-h-[72dvh] overflow-y-auto overscroll-contain">
              {fields.map((f) => (
                <PreviewField key={f.id} field={f} />
              ))}

              <Button className="w-full" disabled>
                Submit (preview)
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type PreviewFieldProps = Readonly<{
  field: FormFieldDraft;
}>;

function PreviewField({ field }: PreviewFieldProps) {
  const label = field.required ? `${field.label} *` : field.label;

  switch (field.type) {
    case "TEXT":
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">{label}</div>
          <Input placeholder="Enter text" />
        </div>
      );

    case "NUMBER":
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">{label}</div>
          <Input type="number" placeholder="0" />
        </div>
      );

    case "DATE":
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">{label}</div>
          <Input type="date" />
        </div>
      );

    case "CHECKBOX":
      return (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Checkbox />
          <div className="text-sm font-medium">{label}</div>
        </div>
      );

    case "DROPDOWN": {
      const options = field.config?.options ?? [];
      const hasOptions = options.length > 0;

      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">{label}</div>

          <Select disabled={!hasOptions}>
            <SelectTrigger>
              <SelectValue
                placeholder={hasOptions ? "Select..." : "No options"}
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "PHOTO":
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">{label}</div>
          <Button variant="outline" className="w-full" disabled>
            Upload photo (preview)
          </Button>
        </div>
      );
  }
}
