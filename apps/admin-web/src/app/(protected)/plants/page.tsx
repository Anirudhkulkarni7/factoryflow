"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { apiFetch } from "@/lib/api/apiFetch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Plant = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function PlantsPage() {
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["plants", q] as const,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", "1");
      sp.set("limit", "200");
      if (q.trim()) sp.set("q", q.trim());

      const res = await api.get<{ items?: Plant[] } | Plant[]>(
        `/plants?${sp.toString()}`,
      );

      return Array.isArray(res) ? res : res.items ?? [];
    },
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const tableBody = useMemo(() => {
  if (query.isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
          Loading...
        </TableCell>
      </TableRow>
    );
  }

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
          No plants found.
        </TableCell>
      </TableRow>
    );
  }

  return rows.map((p) => (
    <TableRow key={p.id} className="hover:bg-muted/50">
      <TableCell className="font-medium">{p.name}</TableCell>
      <TableCell className="text-muted-foreground break-all">{p.id}</TableCell>
    </TableRow>
  ));
}, [query.isLoading, rows]);


  const createMutation = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error("Plant name is required");

      await apiFetch("/plants", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: async () => {
      toast.success("Plant created");
      setCreateOpen(false);
      setNewName("");
      await queryClient.invalidateQueries({ queryKey: ["plants"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to create plant";
      toast.error(msg);
    },
  });

  const canCreate = newName.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plants</h1>
          <p className="text-sm text-muted-foreground">
            Manage plant master data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>Create Plant</Button>

          <Button
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plants..."
          />
        </div>
      </div>

      {query.isError ? (
        <p className="text-sm text-red-500">
          {(query.error as any)?.message ?? "Failed to load plants"}
        </p>
      ) : null}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60%]">Name</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>{tableBody}</TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setNewName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Plant</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium">Plant name</div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Plant B"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canCreate || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}