"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
import { useMutation, useQueryClient ,useQuery} from "@tanstack/react-query";
import { toast } from "sonner";
import { archiveForm, cloneForm, publishForm } from "@/features/forms/api/formActionsApi";

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

  const queryClient = useQueryClient();

const publishMutation = useMutation({
  mutationFn: () => publishForm(id),
  onSuccess: async () => {
    toast.success("Published");
    await queryClient.invalidateQueries({ queryKey: ["forms"] });
    await queryClient.invalidateQueries({ queryKey: ["form", id] });
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Publish failed"),
});

const archiveMutation = useMutation({
  mutationFn: () => archiveForm(id),
  onSuccess: async () => {
    toast.success("Archived");
    await queryClient.invalidateQueries({ queryKey: ["forms"] });
    await queryClient.invalidateQueries({ queryKey: ["form", id] });
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Archive failed"),
});

const cloneMutation = useMutation({
  mutationFn: () => cloneForm(id),
  onSuccess: async (newId) => {
    toast.success("Cloned to draft");
    await queryClient.invalidateQueries({ queryKey: ["forms"] });
    globalThis.window.location.href = `/forms/${newId}`;
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Clone failed"),
});


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
          <p className="text-sm text-muted-foreground break-all">ID: {id}</p>
        </div>

        <div className="flex items-center gap-2">
  {data?.status === "DRAFT" ? (
    <>
      <Button asChild variant="outline">
        <Link href={`/forms/${id}/edit`}>Edit Draft</Link>
      </Button>

      <Button
        onClick={() => publishMutation.mutate()}
        disabled={publishMutation.isPending}
      >
        {publishMutation.isPending ? "Publishing..." : "Publish"}
      </Button>
    </>
  ) : null}

  {data?.status === "PUBLISHED" ? (
    <>
      <Button
        variant="outline"
        onClick={() => cloneMutation.mutate()}
        disabled={cloneMutation.isPending}
      >
        {cloneMutation.isPending ? "Cloning..." : "Clone"}
      </Button>

      <Button
        variant="destructive"
        onClick={() => archiveMutation.mutate()}
        disabled={archiveMutation.isPending}
      >
        {archiveMutation.isPending ? "Archiving..." : "Archive"}
      </Button>
    </>
  ) : null}

  <Button asChild variant="outline">
    <Link href="/forms">Back</Link>
  </Button>
</div>
      </div>

      <Separator />

      <FormDetailBody query={query} id={id} data={data} sortedFields={sortedFields} />
    </div>
  );
}

type FormDetailBodyProps = Readonly<{
  query: ReturnType<typeof useQuery<FormDetail>>;
  id: string;
  data: FormDetail | undefined;
  sortedFields: FormField[];
}>;

function FormDetailBody({ query, data, sortedFields }: FormDetailBodyProps) {
  if (query.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (query.isError) {
    const msg = (query.error as any)?.message ?? "Failed to load form";
    return <div className="text-sm text-red-500">{msg}</div>;
  }

  if (!data) return null;

  const fieldsRows = getFieldsRows(sortedFields);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetaItem label="Version" value={String(data.version)} />
        <MetaItem label="Family ID" value={data.familyId} mono />
        <MetaItem label="Created By" value={data.createdByUserId} mono />
        <MetaItem label="Created At" value={formatDate(data.createdAt)} />
        <MetaItem label="Updated At" value={formatDate(data.updatedAt)} />
        <MetaItem
          label="Plants"
          value={data.plantIds.length > 0 ? `${data.plantIds.length} assigned` : "None"}
        />
      </div>

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Fields</div>
          <div className="text-sm text-muted-foreground">{sortedFields.length} fields</div>
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

            <TableBody>{fieldsRows}</TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function getFieldsRows(fields: FormField[]) {
  if (fields.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
          No fields found.
        </TableCell>
      </TableRow>
    );
  }

  return fields.map((f) => (
    <TableRow key={f.id} className="hover:bg-muted/50">
      <TableCell className="text-muted-foreground">{f.order}</TableCell>
      <TableCell className="font-medium">{f.label}</TableCell>
      <TableCell>
        <Badge variant="secondary">{f.type}</Badge>
      </TableCell>
      <TableCell>{f.required ? "Yes" : "No"}</TableCell>
      <TableCell className="text-muted-foreground">{renderFieldConfig(f)}</TableCell>
    </TableRow>
  ));
}

type StatusBadgeProps = Readonly<{
  status: FormStatus;
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
      <div
        className={
          mono ? "mt-1 text-sm break-all font-mono" : "mt-1 text-sm break-all"
        }
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function renderFieldConfig(field: Pick<FormField, "type" | "config">) {
  if (field.type !== "DROPDOWN") return "—";
  const opts = field.config?.options;
  if (!Array.isArray(opts) || opts.length === 0) return "No options";
  return opts.join(", ");
}