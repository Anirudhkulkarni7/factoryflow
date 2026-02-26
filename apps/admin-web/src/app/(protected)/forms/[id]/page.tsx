"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type FieldType = "TEXT" | "NUMBER" | "CHECKBOX" | "DROPDOWN" | "DATE" | "PHOTO";

type FormField = {
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
  status: FormStatus;
  familyId: string;
  version: number;
  createdByUserId: string;
  plantIds: string[];
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
};

export default function FormDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const query = useQuery({
    queryKey: ["form", id] as const,
    queryFn: () => api.get<FormDetail>(`/forms/${id}`),
    enabled: Boolean(id),
  });

  const data = query.data;

  const sortedFields = useMemo(() => {
    const items = data?.fields ? [...data.fields] : [];
    items.sort((a, b) => a.order - b.order);
    return items;
  }, [data?.fields]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data?.title ?? "Form"}
            </h1>
            {data ? <StatusBadge status={data.status} /> : null}
          </div>
          <p className="text-sm text-muted-foreground break-all">
            ID: {id}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/forms">Back</Link>
        </Button>
      </div>

      <Separator />

      {query.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : query.isError ? (
        <div className="text-sm text-red-500">
          {(query.error as any)?.message ?? "Failed to load form"}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Meta */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem label="Version" value={String(data.version)} />
            <MetaItem label="Family ID" value={data.familyId} mono />
            <MetaItem label="Created By" value={data.createdByUserId} mono />
            <MetaItem label="Created At" value={formatDate(data.createdAt)} />
            <MetaItem label="Updated At" value={formatDate(data.updatedAt)} />
            <MetaItem
              label="Plants"
              value={
                data.plantIds.length > 0 ? `${data.plantIds.length} assigned` : "None"
              }
            />
          </div>

          {/* Plant IDs */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Plant IDs</div>
            {data.plantIds.length === 0 ? (
              <div className="text-sm text-muted-foreground">No plant scope</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.plantIds.map((p) => (
                  <Badge key={p} variant="outline" className="break-all">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Fields</div>
              <div className="text-sm text-muted-foreground">
                {sortedFields.length} fields
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10%]">Order</TableHead>
                    <TableHead className="w-[40%]">Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="w-[30%]">Config</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedFields.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No fields found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFields.map((f) => (
                      <TableRow key={f.id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">
                          {f.order}
                        </TableCell>
                        <TableCell className="font-medium">{f.label}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{f.type}</Badge>
                        </TableCell>
                        <TableCell>{f.required ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {renderFieldConfig(f)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type StatusBadgeProps = Readonly<{
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}>;

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "PUBLISHED") return <Badge>Published</Badge>;
  if (status === "DRAFT") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="outline">Archived</Badge>;
}

type MetaItemProps = Readonly<{
  label: string;
  value: string;
  mono?: boolean;
}>;

function MetaItem({ label, value, mono }: MetaItemProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "mt-1 text-sm break-all font-mono" : "mt-1 text-sm break-all"}>
        {value}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function renderFieldConfig(field: { type: string; config: any }) {
  if (field.type !== "DROPDOWN") return "—";
  const opts: unknown = field.config?.options;
  if (!Array.isArray(opts) || opts.length === 0) return "No options";
  return opts.join(", ");
}