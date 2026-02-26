"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { FormFieldDraft } from "../types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FormCanvasProps = Readonly<{
  fields: FormFieldDraft[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (next: FormFieldDraft[]) => void;
}>;

export function FormCanvas({ fields, selectedId, onSelect, onReorder }: FormCanvasProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Canvas</div>

      <div className="rounded-lg border bg-background">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => {
            const activeId = String(e.active.id);
            const overId = e.over ? String(e.over.id) : null;
            if (!overId || activeId === overId) return;

            const oldIndex = fields.findIndex((f) => f.id === activeId);
            const newIndex = fields.findIndex((f) => f.id === overId);
            if (oldIndex < 0 || newIndex < 0) return;

            onReorder(arrayMove(fields, oldIndex, newIndex));
          }}
        >
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y">
              {fields.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No fields yet. Add from left panel.
                </div>
              ) : (
                fields.map((f) => (
                  <SortableFieldRow
                    key={f.id}
                    id={f.id}
                    label={f.label}
                    type={f.type}
                    required={f.required}
                    selected={selectedId === f.id}
                    onClick={() => onSelect(f.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

type SortableFieldRowProps = Readonly<{
  id: string;
  label: string;
  type: string;
  required: boolean;
  selected: boolean;
  onClick: () => void;
}>;

function SortableFieldRow({ id, label, type, required, selected, onClick }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-3 p-3",
        "cursor-pointer",
        selected ? "bg-muted/60" : "hover:bg-muted/40",
        isDragging ? "opacity-70" : "",
      )}
      onClick={onClick}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{label}</span>
          {required ? <Badge variant="secondary">Required</Badge> : null}
        </div>
        <div className="text-xs text-muted-foreground">{type}</div>
      </div>

      <button
        type="button"
        className={cn(
          "rounded-md border px-2 py-1 text-xs text-muted-foreground",
          "hover:bg-muted",
        )}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label="Drag handle"
      >
        Drag
      </button>
    </div>
  );
}