"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
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

type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type TemplateBrief = {
  id: string;
  title: string;
  version: number;
  familyId: string;
};

type AnswerBrief = {
  id: string;
  fieldId: string;
  value: unknown;
  field?: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    order: number;
  };
};

type SubmissionRow = {
  id: string;
  templateId: string;
  templateVersion: number;
  plantId: string;
  submittedByUserId: string;
  status: SubmissionStatus;
  rejectReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  template?: TemplateBrief;
  answers?: AnswerBrief[];
};

type SubmissionsResponse = {
  items: SubmissionRow[];
  page: number;
  limit: number;
  total: number;
};

type PlantApi = { id: string; name: string };
type UserLookup = { id: string; name?: string; email?: string; username?: string };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function statusBadgeVariant(s: SubmissionStatus) {
  if (s === "APPROVED") return "default";
  if (s === "REJECTED") return "destructive";
  return "secondary";
}

export default function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const submissionsQuery = useQuery({
    queryKey: ["submissions", page, limit] as const,
    queryFn: () =>
      api.get<SubmissionsResponse>(
        `/mobile/forms/submissions?page=${page}&limit=${limit}`,
      ),
  });

  const plantsQuery = useQuery({
    queryKey: ["plants"] as const,
    queryFn: async () => {
      const res = await api.get<{ items?: PlantApi[] } | PlantApi[]>(
        "/plants?page=1&limit=200",
      );
      return Array.isArray(res) ? res : res.items ?? [];
    },
  });

  const usersLookupQuery = useQuery({
    queryKey: ["users-lookup"] as const,
    queryFn: async () => {
      const res = await api.get<{ items?: UserLookup[] } | UserLookup[]>(
        "/users?page=1&limit=200",
      );
      return Array.isArray(res) ? res : res.items ?? [];
    },
  });

  const plantNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plantsQuery.data ?? []) m.set(p.id, p.name);
    return m;
  }, [plantsQuery.data]);

  const userLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersLookupQuery.data ?? []) {
      const label =
        (u.name ?? "").trim() ||
        (u.email ?? "").trim() ||
        (u.username ?? "").trim() ||
        u.id;
      m.set(u.id, label);
    }
    return m;
  }, [usersLookupQuery.data]);

  const data = submissionsQuery.data;
  const rows = data?.items ?? [];

  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;

  const totalPages = useMemo(() => {
    const l = currentLimit > 0 ? currentLimit : 1;
    const pages = Math.ceil(total / l);
    return pages > 0 ? pages : 1;
  }, [currentLimit, total]);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const tableBody = useMemo(() => {
    if (submissionsQuery.isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
            No submissions found.
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((s) => {
      const templateTitle = s.template?.title ?? "Form";
      const plantName = plantNameById.get(s.plantId) ?? s.plantId.slice(0, 8) + "…";
      const submitter =
        userLabelById.get(s.submittedByUserId) ?? s.submittedByUserId.slice(0, 8) + "…";
      const answerCount = s.answers?.length ?? 0;

      return (
        <TableRow key={s.id} className="hover:bg-muted/50">
          <TableCell className="font-medium">
            <Link className="underline underline-offset-2" href={`/submissions/${s.id}`}>
              {templateTitle}
            </Link>
            <div className="text-xs text-muted-foreground">
              Submission {s.id.slice(0, 8)}…
            </div>
          </TableCell>

          <TableCell>
            <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
          </TableCell>

          <TableCell>{plantName}</TableCell>

          <TableCell className="text-muted-foreground">{submitter}</TableCell>

          <TableCell className="text-muted-foreground">{answerCount}</TableCell>

          <TableCell>{formatDateTime(s.submittedAt)}</TableCell>
        </TableRow>
      );
    });
  }, [plantNameById, rows, submissionsQuery.isLoading, userLabelById]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve/reject submitted forms.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => submissionsQuery.refetch()}
          disabled={submissionsQuery.isFetching}
        >
          {submissionsQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {submissionsQuery.isError ? (
        <p className="text-sm text-red-500">
          {(submissionsQuery.error as any)?.message ?? "Failed to load submissions"}
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plant</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Answers</TableHead>
              <TableHead>Submitted At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{tableBody}</TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{total}</span> • Page{" "}
          <span className="font-medium text-foreground">{currentPage}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev || submissionsQuery.isFetching}
          >
            Prev
          </Button>

          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={!canNext || submissionsQuery.isFetching}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}