"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Clock,
  Factory,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardSummary = {
  total: number;
  byStatus: { SUBMITTED: number; APPROVED: number; REJECTED: number };
};

type RecentSubmissionRow = {
  id: string;
  templateId: string;
  templateVersion: number;
  plantId: string;
  submittedByUserId: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  templateTitle: string | null;
};

type RecentSubmissionsResponse = {
  items: RecentSubmissionRow[];
  page: number;
  limit: number;
  total: number;
};

type PlantSummaryItem = {
  plantId: string;
  plantName: string | null;
  total: string | number;
  submitted: string | number;
  approved: string | number;
  rejected: string | number;
};

type PlantSummaryResponse = {
  from: string;
  to: string;
  items: PlantSummaryItem[];
};

type TemplateSummaryItem = {
  templateId: string;
  templateTitle: string | null;
  total: string | number;
  submitted: string | number;
  approved: string | number;
  rejected: string | number;
};

type TemplateSummaryResponse = {
  from: string;
  to: string;
  items: TemplateSummaryItem[];
};

type TrendsItem = {
  bucket: string;
  total: string | number;
  submitted: string | number;
  approved: string | number;
  rejected: string | number;
};

type TrendsResponse = {
  from: string;
  to: string;
  bucket: "day" | "week";
  items: TrendsItem[];
};

type PendingAgingItem = { bucket: string; count: string | number };
type PendingAgingResponse = { items: PendingAgingItem[] };

type TopSubmitterItem = { userId: string; count: string | number };
type TopSubmittersResponse = {
  from: string;
  to: string;
  items: TopSubmitterItem[];
};

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  role: "ADMIN" | "MANAGER" | "USER";
  plantIds: string[];
  active?: boolean;
};

type UsersResponse = {
  items: UserRow[];
  page: number;
  limit: number;
  total: number;
};

function toInt(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function statusBadgeVariant(s: "SUBMITTED" | "APPROVED" | "REJECTED") {
  if (s === "APPROVED") return "default";
  if (s === "REJECTED") return "destructive";
  return "secondary";
}

type KpiCardProps = Readonly<{
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
}>;

function KpiCard({ title, value, subtitle, icon }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40 mask-[radial-gradient(350px_220px_at_20%_0%,black,transparent)] bg-linear-to-br from-muted to-background" />
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type StackedBarProps = Readonly<{
  submitted: number;
  approved: number;
  rejected: number;
}>;

function StackedBar({ submitted, approved, rejected }: StackedBarProps) {
  const total = submitted + approved + rejected;
  if (total <= 0) return <div className="text-sm text-muted-foreground">—</div>;

  const subPct = (submitted / total) * 100;
  const appPct = (approved / total) * 100;
  const rejPct = (rejected / total) * 100;

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-2 w-full">
          <div className="h-2 bg-secondary" style={{ width: `${subPct}%` }} />
          <div className="h-2 bg-primary" style={{ width: `${appPct}%` }} />
          <div className="h-2 bg-destructive" style={{ width: `${rejPct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          Pending: {submitted}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Approved: {approved}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          Rejected: {rejected}
        </span>
      </div>
    </div>
  );
}

type MiniLineProps = Readonly<{ values: number[] }>;

function MiniLine({ values }: MiniLineProps) {
  const path = useMemo(() => {
    const v = values.filter((x) => Number.isFinite(x));
    if (v.length < 2) return "";

    const w = 220;
    const h = 56;
    const max = Math.max(...v, 1);
    const step = w / (v.length - 1);

    const points = v.map((n, idx) => {
      const x = idx * step;
      const y = h - (n / max) * (h - 10) - 5;
      return { x, y };
    });

    return points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ");
  }, [values]);

  if (!path) return <div className="text-sm text-muted-foreground">—</div>;

  return (
    <svg width="220" height="56" viewBox="0 0 220 56" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

type AgingBarsProps = Readonly<{ items: { bucket: string; count: number }[] }>;

function AgingBars({ items }: AgingBarsProps) {
  if (items.length === 0)
    return <div className="text-sm text-muted-foreground">—</div>;

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-3">
      {items.map((i) => {
        const pct = (i.count / max) * 100;
        return (
          <div key={i.bucket} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{i.bucket}</span>
              <span>{i.count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function userLabelFromRow(u: UserRow) {
  const name = (u.name ?? "").trim();
  if (name) return name;

  const email = (u.email ?? "").trim();
  if (email) return email;

  const username = (u.username ?? "").trim();
  if (username) return username;

  return u.id;
}

export default function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"] as const,
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  });

  const recentQuery = useQuery({
    queryKey: ["dashboard", "recent-submissions"] as const,
    queryFn: () =>
      api.get<RecentSubmissionsResponse>(
        "/dashboard/recent-submissions?page=1&limit=8",
      ),
  });

  const plantSummaryQuery = useQuery({
    queryKey: ["dashboard", "plant-summary"] as const,
    queryFn: () => api.get<PlantSummaryResponse>("/dashboard/plant-summary"),
  });

  const templateSummaryQuery = useQuery({
    queryKey: ["dashboard", "template-summary"] as const,
    queryFn: () =>
      api.get<TemplateSummaryResponse>("/dashboard/template-summary?limit=6"),
  });

  const trendsQuery = useQuery({
    queryKey: ["dashboard", "trends"] as const,
    queryFn: () => api.get<TrendsResponse>("/dashboard/trends?bucket=day"),
  });

  const pendingAgingQuery = useQuery({
    queryKey: ["dashboard", "pending-aging"] as const,
    queryFn: () => api.get<PendingAgingResponse>("/dashboard/pending-aging"),
  });

  const topSubmittersQuery = useQuery({
    queryKey: ["dashboard", "top-submitters"] as const,
    queryFn: () =>
      api.get<TopSubmittersResponse>("/dashboard/top-submitters?limit=6"),
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", "users-map"] as const,
    queryFn: () => api.get<UsersResponse>("/users?page=1&limit=100"),
  });

  const anyLoading =
    summaryQuery.isLoading ||
    recentQuery.isLoading ||
    plantSummaryQuery.isLoading ||
    templateSummaryQuery.isLoading ||
    trendsQuery.isLoading ||
    pendingAgingQuery.isLoading ||
    topSubmittersQuery.isLoading ||
    usersQuery.isLoading;

  const anyError =
    summaryQuery.isError ||
    plantSummaryQuery.isError ||
    templateSummaryQuery.isError ||
    trendsQuery.isError ||
    pendingAgingQuery.isError ||
    topSubmittersQuery.isError;

  const errorMessage = useMemo(() => {
    const errs = [
      summaryQuery.error,
      plantSummaryQuery.error,
      templateSummaryQuery.error,
      trendsQuery.error,
      pendingAgingQuery.error,
      topSubmittersQuery.error,
    ];
    for (const e of errs) {
      const msg = (e as any)?.message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    return "Failed to load dashboard";
  }, [
    summaryQuery.error,
    plantSummaryQuery.error,
    templateSummaryQuery.error,
    trendsQuery.error,
    pendingAgingQuery.error,
    topSubmittersQuery.error,
  ]);

  const summary = useMemo(() => {
    const d = summaryQuery.data;
    if (!d) return { total: 0, submitted: 0, approved: 0, rejected: 0 };

    return {
      total: d.total,
      submitted: d.byStatus.SUBMITTED,
      approved: d.byStatus.APPROVED,
      rejected: d.byStatus.REJECTED,
    };
  }, [summaryQuery.data]);

  const trendsPoints = useMemo(() => {
    const items = trendsQuery.data?.items ?? [];
    return items.map((it) => ({
      label: formatDay(it.bucket),
      total: toInt(it.total),
      submitted: toInt(it.submitted),
      approved: toInt(it.approved),
      rejected: toInt(it.rejected),
    }));
  }, [trendsQuery.data?.items]);

  const trendValues = useMemo(
    () => trendsPoints.map((p) => p.total),
    [trendsPoints],
  );

  const pendingAging = useMemo(() => {
    const items = pendingAgingQuery.data?.items ?? [];
    return items.map((it) => ({ bucket: it.bucket, count: toInt(it.count) }));
  }, [pendingAgingQuery.data?.items]);

  const plantRows = useMemo(() => {
    const items = plantSummaryQuery.data?.items ?? [];
    return items.map((it) => ({
      plantId: it.plantId,
      plantName: it.plantName ?? it.plantId,
      total: toInt(it.total),
      submitted: toInt(it.submitted),
      approved: toInt(it.approved),
      rejected: toInt(it.rejected),
    }));
  }, [plantSummaryQuery.data?.items]);

  const templateRows = useMemo(() => {
    const items = templateSummaryQuery.data?.items ?? [];
    return items.map((it) => ({
      templateId: it.templateId,
      templateTitle: it.templateTitle ?? "Form",
      total: toInt(it.total),
      submitted: toInt(it.submitted),
      approved: toInt(it.approved),
      rejected: toInt(it.rejected),
    }));
  }, [templateSummaryQuery.data?.items]);

  const userLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    const users = usersQuery.data?.items ?? [];
    for (const u of users) m.set(u.id, userLabelFromRow(u));
    return m;
  }, [usersQuery.data?.items]);

  const topSubmitters = useMemo(() => {
    const items = topSubmittersQuery.data?.items ?? [];
    return items.map((it) => ({
      userId: it.userId,
      label: userLabelMap.get(it.userId) ?? it.userId,
      count: toInt(it.count),
    }));
  }, [topSubmittersQuery.data?.items, userLabelMap]);

  const recentTableBody = useMemo(() => {
    if (recentQuery.isLoading) {
      return (
        <TableRow>
          <TableCell
            colSpan={3}
            className="h-20 text-center text-muted-foreground"
          >
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (recentQuery.isError) {
      return (
        <TableRow>
          <TableCell
            colSpan={3}
            className="h-20 text-center text-muted-foreground"
          >
            Recent submissions unavailable.
          </TableCell>
        </TableRow>
      );
    }

    const items = recentQuery.data?.items ?? [];
    if (items.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={3}
            className="h-20 text-center text-muted-foreground"
          >
            No data.
          </TableCell>
        </TableRow>
      );
    }

    return items.map((s) => (
      <TableRow key={s.id} className="hover:bg-muted/50">
        <TableCell className="font-medium">
          <Link
            className="underline underline-offset-2"
            href={`/submissions/${s.id}`}
          >
            {s.templateTitle ?? "Form"}
          </Link>
        </TableCell>
        <TableCell>
          <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDateTime(s.submittedAt)}
        </TableCell>
      </TableRow>
    ));
  }, [recentQuery.data?.items, recentQuery.isError, recentQuery.isLoading]);

  const refreshAll = () => {
    void summaryQuery.refetch();
    void recentQuery.refetch();
    void plantSummaryQuery.refetch();
    void templateSummaryQuery.refetch();
    void trendsQuery.refetch();
    void pendingAgingQuery.refetch();
    void topSubmittersQuery.refetch();
    void usersQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={anyLoading}>
            {anyLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/submissions">Submissions</Link>
          </Button>
        </div>
      </div>

      {anyError ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total submissions"
          value={summary.total}
          subtitle="Across all statuses"
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending"
          value={summary.submitted}
          subtitle="Needs review"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Approved"
          value={summary.approved}
          subtitle="Completed"
          icon={<BadgeCheck className="h-5 w-5" />}
        />
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40 mask-[radial-gradient(350px_220px_at_20%_0%,black,transparent)] bg-linear-to-br from-muted to-background" />
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trend (Total)
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="text-3xl font-semibold tracking-tight">
                {trendValues.length > 0
                  ? trendValues[trendValues.length - 1]
                  : 0}
              </div>
              <div className="text-xs text-muted-foreground">Latest bucket</div>
            </div>
            <div className="text-muted-foreground">
              <MiniLine values={trendValues} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Status distribution</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Pending</Badge>
            <Badge>Approved</Badge>
            <Badge variant="destructive">Rejected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <StackedBar
            submitted={summary.submitted}
            approved={summary.approved}
            rejected={summary.rejected}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between w-full">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">
                Recent submissions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest 8 submissions
              </p>
            </div>

            <Button asChild variant="outline" size="sm" className="ml-4">
              <Link href="/submissions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{recentTableBody}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Pending aging</CardTitle>
              <p className="text-sm text-muted-foreground">
                How old are pending submissions?
              </p>
            </div>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AgingBars items={pendingAging} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top plants</CardTitle>
            <Factory className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {plantRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data.</div>
            ) : (
              plantRows.slice(0, 6).map((p) => (
                <div key={p.plantId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{p.plantName}</div>
                    <div className="text-sm text-muted-foreground">
                      Total: {p.total}
                    </div>
                  </div>
                  <StackedBar
                    submitted={p.submitted}
                    approved={p.approved}
                    rejected={p.rejected}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top forms</CardTitle>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {templateRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data.</div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateRows.slice(0, 6).map((t) => (
                      <TableRow
                        key={t.templateId}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {t.templateTitle}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {t.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top submitters</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {topSubmitters.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data.</div>
            ) : (
              topSubmitters.map((u) => (
                <div
                  key={u.userId}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {u.label}
                    </div>
                  </div>
                  <Badge variant="secondary">{u.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
