"use client";

import { useEffect, useState } from "react";
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

export default function FormsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get<ListResponse>("/forms?page=1&limit=20");
      setData(res);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
  <div className="space-y-6">
    {/* Header row: Title left, Refresh right */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
        <p className="text-sm text-muted-foreground">
          Manage form templates across plants.
        </p>
      </div>

      <Button onClick={load} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </Button>
    </div>

    {err && <p className="text-sm text-red-500">{err}</p>}

    {data && (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Total: <span className="text-foreground font-medium">{data.total}</span>
        </p>

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

            <TableBody>
              {data.items.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{t.title}</TableCell>

                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>

                  <TableCell>{t.version}</TableCell>

                  <TableCell className="text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}

              {data.items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No forms found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )}
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