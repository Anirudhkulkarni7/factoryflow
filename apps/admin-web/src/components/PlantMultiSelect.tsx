"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type PlantOption = Readonly<{
  id: string;
  name: string;
}>;

type PlantMultiSelectProps = Readonly<{
  options: PlantOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}>;

export function PlantMultiSelect({
  options,
  value,
  onChange,
  disabled,
}: PlantMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value],
  );

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between"
            disabled={disabled}
          >
            {value.length > 0
              ? `${value.length} plant(s) selected`
              : "Select plants..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search plants..." />
            <CommandList>
              <CommandEmpty>No plants found.</CommandEmpty>

              <CommandGroup>
                {options.map((opt) => {
                  const active = value.includes(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.name}
                      onSelect={() => toggle(opt.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{opt.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* selected chips */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1">
              <span className="max-w-55 truncate">{s.name}</span>
              <button
                type="button"
                className="ml-1 rounded-sm opacity-70 hover:opacity-100"
                onClick={() => onChange(value.filter((x) => x !== s.id))}
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}