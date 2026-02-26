"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type FormTemplate = {
  id: string;
  title: string;
  status: FormStatus;
  version: number;
  familyId: string;
  createdAt: string;
};

type ListResponse = {
  items: FormTemplate[];
  page: number;
  limit: number;
  total: number;
};

const LIMIT = 20 as const;

type StatusFilter = "ALL" | FormStatus;

export default function FormsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const debouncedQ = useDebouncedValue(q, 400);

  // whenever filters change, jump back to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status]);

  const queryKey = useMemo(
    () => ["forms", page, LIMIT, debouncedQ, status] as const,
    [page, debouncedQ, status],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(LIMIT));
      if (debouncedQ.trim()) sp.set("q", debouncedQ.trim());
      if (status !== "ALL") sp.set("status", status);

      return api.get<ListResponse>(`/forms?${sp.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const tableRows = useMemo(() => {
    if (query.isLoading) {
      return (
        <TableRow>
          <TableCell
            colSpan={4}
            className="h-24 text-center text-muted-foreground"
          >
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (!data || data.items.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={4}
            className="h-24 text-center text-muted-foreground"
          >
            No forms found.
          </TableCell>
        </TableRow>
      );
    }

    return data.items.map((t) => (
      <TableRow
        key={t.id}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => router.push(`/forms/${t.id}`)}
      >
        <TableCell className="font-medium">{t.title}</TableCell>
        <TableCell>
          <StatusBadge status={t.status} />
        </TableCell>
        <TableCell>{t.version}</TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(t.createdAt).toLocaleString()}
        </TableCell>
      </TableRow>
    ));
  }, [data, query.isLoading, router]);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
          <p className="text-sm text-muted-foreground">
            Manage form templates across plants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/forms/new")}>Create Form</Button>

          <Button
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-sm">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search forms..."
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {data ? (
            <>
              Page{" "}
              <span className="text-foreground font-medium">{data.page}</span>{" "}
              of{" "}
              <span className="text-foreground font-medium">{totalPages}</span>
            </>
          ) : (
            " "
          )}
        </div>
      </div>

      {/* Error */}
      {query.isError ? (
        <p className="text-sm text-red-500">
          {(query.error as any)?.message ?? "Failed to load forms"}
        </p>
      ) : null}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>{tableRows}</TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total:{" "}
          <span className="text-foreground font-medium">
            {data?.total ?? 0}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || query.isFetching}
          >
            Prev
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={data ? page >= totalPages || query.isFetching : true}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

type StatusBadgeProps = Readonly<{
  status: FormStatus;
}>;

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "PUBLISHED") return <Badge>Published</Badge>;
  if (status === "DRAFT") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="outline">Archived</Badge>;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebounced(value), delayMs);
    return () => globalThis.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
