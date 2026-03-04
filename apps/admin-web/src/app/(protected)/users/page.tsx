"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { apiFetch } from "@/lib/api/apiFetch";

import { PlantMultiSelect, type PlantOption } from "@/components/PlantMultiSelect";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = "ADMIN" | "MANAGER" | "USER";

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  role: UserRole;
  plantIds: string[];
  active?: boolean; // backend uses this
  isActive?: boolean; // fallback if any older response uses it
};

type UsersResponse = {
  items: UserRow[];
  page: number;
  limit: number;
  total: number;
};

type PlantApi = { id: string; name: string };

function userDisabled(u: UserRow) {
  return u.active === false || u.isActive === false;
}

export default function UsersPage() {
  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // create manager
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPlantIds, setCreatePlantIds] = useState<string[]>([]);

  // edit user
  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("USER");
  const [editPlantIds, setEditPlantIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["users", page, limit] as const,
    queryFn: async () => {
      return api.get<UsersResponse>(`/users?page=${page}&limit=${limit}`);
    },
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

  const plantOptions: PlantOption[] = useMemo(
    () => (plantsQuery.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    [plantsQuery.data],
  );

  // Mutations (declare BEFORE using in table render)
  const createManagerMutation = useMutation({
    mutationFn: async () => {
      const n = createName.trim();
      const e = createEmail.trim();
      const p = createPassword.trim();

      if (n.length < 2) throw new Error("Name must be at least 2 characters");
      if (!e) throw new Error("Email is required");
      if (p.length < 6) throw new Error("Password must be at least 6 characters");
      if (createPlantIds.length === 0) throw new Error("Select at least one plant");

      await apiFetch("/users/managers", {
        method: "POST",
        body: JSON.stringify({
          name: n,
          email: e,
          password: p,
          plantIds: createPlantIds,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Manager created");
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreatePlantIds([]);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to create manager");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      const n = editName.trim();
      if (!editUserId) throw new Error("Missing user id");
      if (n.length < 2) throw new Error("Name must be at least 2 characters");

      await apiFetch(`/users/${editUserId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: n,
          role: editRole,
          plantIds: editPlantIds,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("User updated");
      setEditOpen(false);
      setEditUserId("");
      setEditName("");
      setEditEmail("");
      setEditRole("USER");
      setEditPlantIds([]);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    },
  });

  const enableDisableMutation = useMutation({
    mutationFn: async (payload: { id: string; enable: boolean }) => {
      const path = payload.enable
        ? `/users/${payload.id}/enable`
        : `/users/${payload.id}/disable`;

      await apiFetch(path, { method: "PATCH" });
    },
    onSuccess: async (_, vars) => {
      toast.success(vars.enable ? "User enabled" : "User disabled");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Action failed");
    },
  });

  function openEdit(u: UserRow) {
    setEditUserId(u.id);
    setEditName((u.name ?? "").trim() || (u.username ?? "").trim() || "");
    setEditEmail((u.email ?? "").trim() || "");
    setEditRole(u.role);
    setEditPlantIds(u.plantIds ?? []);
    setEditOpen(true);
  }

  const usersData = usersQuery.data;
  const rows = usersData?.items ?? [];

  const total = usersData?.total ?? 0;
  const currentPage = usersData?.page ?? page;
  const currentLimit = usersData?.limit ?? limit;

  const totalPages = useMemo(() => {
    const l = currentLimit > 0 ? currentLimit : 1;
    const pages = Math.ceil(total / l);
    return pages > 0 ? pages : 1;
  }, [currentLimit, total]);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const tableBody = useMemo(() => {
    if (usersQuery.isLoading) {
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
            No users found.
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((u) => {
      const displayName =
        (u.name ?? "").trim() || (u.username ?? "").trim() || "—";
      const displayEmail = (u.email ?? "").trim() || "—";
      const disabled = userDisabled(u);

      return (
        <TableRow key={u.id} className="hover:bg-muted/50">
          <TableCell className="font-medium">{displayName}</TableCell>
          <TableCell className="text-muted-foreground">{displayEmail}</TableCell>
          <TableCell>{u.role}</TableCell>
          <TableCell>{u.plantIds?.length ?? 0}</TableCell>
          <TableCell>{disabled ? "Disabled" : "Active"}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                Edit
              </Button>

              <Button
                variant={disabled ? "default" : "destructive"}
                size="sm"
                onClick={() =>
                  enableDisableMutation.mutate({ id: u.id, enable: disabled })
                }
                disabled={enableDisableMutation.isPending}
              >
                {disabled ? "Enable" : "Disable"}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }, [enableDisableMutation, rows, usersQuery.isLoading]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage admins, managers, and users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>Create Manager</Button>

          <Button
            variant="outline"
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            {usersQuery.isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {usersQuery.isError ? (
        <p className="text-sm text-red-500">
          {(usersQuery.error as any)?.message ?? "Failed to load users"}
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%]">Name</TableHead>
              <TableHead className="w-[28%]">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>{tableBody}</TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{total}</span> •
          Page{" "}
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
            disabled={!canPrev || usersQuery.isFetching}
          >
            Prev
          </Button>

          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={!canNext || usersQuery.isFetching}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create Manager Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateName("");
            setCreateEmail("");
            setCreatePassword("");
            setCreatePlantIds([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manager</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Name</div>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Manager name"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Email</div>
              <Input
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="manager@factoryflow.local"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Password</div>
              <Input
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Minimum 6 characters"
                type="password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Plants</div>
              <PlantMultiSelect
                options={plantOptions}
                value={createPlantIds}
                onChange={setCreatePlantIds}
                disabled={plantsQuery.isLoading || plantsQuery.isError}
              />
              {plantsQuery.isError ? (
                <p className="text-sm text-red-500">Failed to load plants</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={() => createManagerMutation.mutate()}
                disabled={createManagerMutation.isPending}
              >
                {createManagerMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditUserId("");
            setEditName("");
            setEditEmail("");
            setEditRole("USER");
            setEditPlantIds([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Name</div>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="User name"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Email</div>
              <Input value={editEmail} readOnly />
              <p className="text-xs text-muted-foreground">
                Email can’t be changed here.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Role</div>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Plants</div>
              <PlantMultiSelect
                options={plantOptions}
                value={editPlantIds}
                onChange={setEditPlantIds}
                disabled={plantsQuery.isLoading || plantsQuery.isError}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={() => updateUserMutation.mutate()}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}