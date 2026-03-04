"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { apiFetch } from "@/lib/api/apiFetch";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
type FieldType = "TEXT" | "NUMBER" | "CHECKBOX" | "DROPDOWN" | "DATE" | "PHOTO";

type TemplateBrief = {
  id: string;
  title: string;
  version: number;
  familyId: string;
};

type Answer = {
  id: string;
  fieldId: string;
  value: unknown;
  field: {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    order: number;
    config: null | { options?: string[] };
  };
};

type SubmissionDetail = {
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
  answers: Answer[];
};

type PlantApi = { id: string; name: string };
type UserLookup = { id: string; name?: string; email?: string; username?: string };

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return String(value);
  if (value instanceof Date) return value.toISOString();

  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function formatAnswerValue(type: FieldType, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";

  if (type === "CHECKBOX") {
    const v =
      typeof value === "boolean"
        ? value
        : String(value).toLowerCase() === "true";
    return v ? "Yes" : "No";
  }

  if (type === "DATE") {
    const raw = safeText(value);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString();
  }

  return safeText(value);
}

type MetaProps = Readonly<{ label: string; value: string }>;

function Meta({ label, value }: MetaProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm wrap-break-word">{value}</div>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);

  const submissionQuery = useQuery({
    queryKey: ["submission", id] as const,
    queryFn: () => api.get<SubmissionDetail>(`/mobile/forms/submissions/${id}`),
    enabled: Boolean(id),
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

  const data = submissionQuery.data;

  const answersSorted = useMemo(() => {
    const list = data?.answers ? [...data.answers] : [];
    list.sort((a, b) => (a.field?.order ?? 0) - (b.field?.order ?? 0));
    return list;
  }, [data?.answers]);

  const canReview = data?.status === "SUBMITTED";

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/mobile/forms/submissions/${id}/approve`, {
        method: "POST",
      });
    },
    onSuccess: async () => {
      toast.success("Submission approved");
      await queryClient.invalidateQueries({ queryKey: ["submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["submission", id] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const reason = rejectReason.trim();
      if (reason.length < 2) throw new Error("Enter a reject reason (min 2 chars)");

      // If backend complains about "reason", rename to { rejectReason: reason }
      await apiFetch(`/mobile/forms/submissions/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: async () => {
      toast.success("Submission rejected");
      setRejectOpen(false);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ["submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["submission", id] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    },
  });

  async function openPhoto(photoKey: string, title: string) {
    setPhotoTitle(title);
    setPhotoUrl("");
    setPhotoOpen(true);
    setPhotoLoading(true);

    try {
      const res = await api.get<{ url?: string } | string>(
        `/files/signed-url?key=${encodeURIComponent(photoKey)}`,
      );

      const url = typeof res === "string" ? res : res.url ?? "";
      if (!url) throw new Error("Signed URL not returned");

      setPhotoUrl(url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load photo");
      setPhotoOpen(false);
    } finally {
      setPhotoLoading(false);
    }
  }

  const content = useMemo(() => {
    if (submissionQuery.isLoading) {
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    }

    if (submissionQuery.isError) {
      return (
        <div className="text-sm text-red-500">
          {(submissionQuery.error as any)?.message ?? "Failed to load submission"}
        </div>
      );
    }

    if (!data) return null;

    const templateTitle = data.template?.title ?? "Form";
    const plantName = plantNameById.get(data.plantId) ?? data.plantId;
    const submitter =
      userLabelById.get(data.submittedByUserId) ?? data.submittedByUserId;

    const reviewer =
      data.reviewedByUserId
        ? userLabelById.get(data.reviewedByUserId) ?? data.reviewedByUserId
        : "—";

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="Form" value={`${templateTitle} (v${data.templateVersion})`} />
          <Meta label="Status" value={data.status} />
          <Meta label="Plant" value={plantName} />
          <Meta label="Submitted By" value={submitter} />
          <Meta label="Submitted At" value={formatDateTime(data.submittedAt)} />
          <Meta label="Reviewed At" value={formatDateTime(data.reviewedAt)} />
          <Meta label="Reviewed By" value={reviewer} />
          <Meta label="Reject Reason" value={data.rejectReason ?? "—"} />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Answers</div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%]">Order</TableHead>
                  <TableHead className="w-[55%]">Question</TableHead>
                  <TableHead>Answer</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {answersSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No answers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  answersSorted.map((a) => {
                    const isPhoto = a.field.type === "PHOTO";
                    const photoKey =
                      typeof a.value === "string" ? a.value.trim() : "";

                    return (
                      <TableRow key={a.id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">
                          {a.field.order}
                        </TableCell>
                        <TableCell className="font-medium">{a.field.label}</TableCell>
                        <TableCell className="text-muted-foreground wrap-break-word">
                          {isPhoto && photoKey ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openPhoto(photoKey, a.field.label)}
                            >
                              View photo
                            </Button>
                          ) : (
                            formatAnswerValue(a.field.type, a.value)
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }, [answersSorted, data, plantNameById, submissionQuery, userLabelById]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Submission</h1>
            {data ? <Badge variant="secondary">{data.status}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground wrap-break-word">ID: {id}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={() => setRejectOpen(true)}
            disabled={!canReview || approveMutation.isPending || rejectMutation.isPending}
          >
            Reject
          </Button>

          <Button
            onClick={() => approveMutation.mutate()}
            disabled={!canReview || approveMutation.isPending || rejectMutation.isPending}
          >
            {approveMutation.isPending ? "Approving..." : "Approve"}
          </Button>

          <Button asChild variant="outline">
            <Link href="/submissions">Back</Link>
          </Button>
        </div>
      </div>

      <Separator />
      {content}

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium">Reason</div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reject reason..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be visible to the submitter.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={photoOpen}
        onOpenChange={(open) => {
          setPhotoOpen(open);
          if (!open) {
            setPhotoUrl("");
            setPhotoTitle("");
            setPhotoLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{photoTitle || "Photo"}</DialogTitle>
          </DialogHeader>

          {photoLoading ? (
            <div className="text-sm text-muted-foreground">Loading photo...</div>
          ) : photoUrl ? (
            <div className="overflow-auto">
              <img
                src={photoUrl}
                alt={photoTitle || "Photo"}
                className="h-auto w-full rounded-lg border"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No photo URL</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}