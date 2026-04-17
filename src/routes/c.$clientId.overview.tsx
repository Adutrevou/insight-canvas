import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatValue } from "@/lib/format";
import type { Dashboard, DashboardWidget, Metric, ManualUpdate } from "@/lib/db-types";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
import { TrendingUp, TrendingDown, LayoutDashboard, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/c/$clientId/overview")({
  component: Overview,
});

interface DataRow { row_data: Record<string, unknown>; data_source_id: string; }

function Overview() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [updates, setUpdates] = useState<ManualUpdate[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: ms }, { data: us }] = await Promise.all([
        supabase.from("metrics").select("*").eq("client_id", clientId),
        supabase.from("manual_updates").select("*").eq("client_id", clientId).order("period", { ascending: true }),
      ]);
      setMetrics((ms ?? []) as Metric[]);
      setUpdates((us ?? []) as ManualUpdate[]);

      // Pull data rows for any metric backed by an uploaded source
      const sourceIds = Array.from(new Set(((ms ?? []) as Metric[]).map((m) => m.data_source_id).filter(Boolean))) as string[];
      if (sourceIds.length) {
        const { data: rows } = await supabase.from("data_rows").select("row_data, data_source_id").in("data_source_id", sourceIds);
        setDataRows((rows ?? []) as DataRow[]);
      }

      // Default dashboard + widgets (the per-client customization)
      let { data: d } = await supabase.from("dashboards").select("*").eq("client_id", clientId).eq("is_default", true).maybeSingle();
      if (!d && user) {
        const { data: created } = await supabase
          .from("dashboards")
          .insert({ client_id: clientId, name: "Main Dashboard", is_default: true, created_by: user.id })
          .select().single();
        d = created;
      }
      setDashboard(d as Dashboard);
      if (d) {
        const { data: ws } = await supabase
          .from("dashboard_widgets")
          .select("*")
          .eq("dashboard_id", (d as Dashboard).id)
          .order("position", { ascending: true });
        setWidgets((ws ?? []) as DashboardWidget[]);
      }
    })();
  }, [clientId, user]);

  function aggregateValues(values: number[], agg: string): number {
    if (!values.length) return 0;
    switch (agg) {
      case "avg": return values.reduce((s, v) => s + v, 0) / values.length;
      case "count": return values.length;
      case "min": return Math.min(...values);
      case "max": return Math.max(...values);
      default: return values.reduce((s, v) => s + v, 0);
    }
  }

  function compute(m: Metric): { current: number; prev: number; series: { period: string; value: number }[] } {
    // Source-backed metric: aggregate from uploaded rows, grouped by period field if present
    if (m.data_source_id && m.field) {
      const rows = dataRows.filter((r) => r.data_source_id === m.data_source_id);
      const periodKey = (m.filters as { period_field?: string } | null)?.period_field;
      const byPeriod = new Map<string, number[]>();
      let allValues: number[] = [];
      for (const r of rows) {
        const raw = r.row_data[m.field];
        const num = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[^0-9.\-]/g, ""));
        if (!Number.isFinite(num)) continue;
        allValues.push(num);
        if (periodKey) {
          const p = String(r.row_data[periodKey] ?? "").slice(0, 7);
          if (p) {
            const arr = byPeriod.get(p) ?? [];
            arr.push(num);
            byPeriod.set(p, arr);
          }
        }
      }
      const series = Array.from(byPeriod.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, vals]) => ({ period, value: aggregateValues(vals, m.aggregation ?? "sum") }));
      const current = series.length ? series[series.length - 1].value : aggregateValues(allValues, m.aggregation ?? "sum");
      const prev = series.length > 1 ? series[series.length - 2].value : current;
      return { current, prev, series };
    }

    // Manual-update-backed metric
    const mUpdates = updates.filter((u) => u.metric_id === m.id);
    const byPeriod = new Map<string, number[]>();
    for (const u of mUpdates) {
      const arr = byPeriod.get(u.period) ?? [];
      arr.push(Number(u.value));
      byPeriod.set(u.period, arr);
    }
    const series = Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({ period: period.slice(0, 7), value: aggregateValues(vals, m.aggregation ?? "sum") }));
    const current = series.length ? series[series.length - 1].value : 0;
    const prev = series.length > 1 ? series[series.length - 2].value : current;
    return { current, prev, series };
  }

  const metricById = (id: string | null) => metrics.find((m) => m.id === id);

  // If the user has configured widgets, use them. Otherwise fall back to showing all metrics.
  const items: { id: string; metric: Metric; widget_type: string }[] = widgets.length
    ? widgets
        .map((w) => {
          const metric = metricById(w.metric_id);
          return metric ? { id: w.id, metric, widget_type: w.widget_type ?? metric.chart_type ?? "kpi" } : null;
        })
        .filter((x): x is { id: string; metric: Metric; widget_type: string } => !!x)
    : metrics.map((m) => ({ id: m.id, metric: m, widget_type: m.chart_type ?? "kpi" }));

  const kpis = items.filter((it) => it.widget_type === "kpi");
  const charts = items.filter((it) => it.widget_type !== "kpi");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Overview</h1>
            <p className="text-sm text-muted-foreground">
              {widgets.length ? "Your custom dashboard — edit widgets in the builder." : "Showing all metrics. Open the Dashboard Builder to customize what appears here."}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/c/$clientId/dashboard-builder" params={{ clientId }}>
              <LayoutDashboard className="mr-1.5 h-4 w-4" />Customize dashboard
            </Link>
          </Button>
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <p>No metrics yet for this client.</p>
              <div className="flex justify-center gap-2">
                <Button asChild><Link to="/c/$clientId/data-sources" params={{ clientId }}><Plus className="mr-1.5 h-4 w-4" />Upload data</Link></Button>
                <Button variant="outline" asChild><Link to="/c/$clientId/metrics" params={{ clientId }}>Build a metric</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {kpis.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map(({ id, metric: m }) => {
              const { current, prev } = compute(m);
              const delta = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0;
              return (
                <Card key={id}>
                  <CardContent className="p-5">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.name}</div>
                    <div className="mt-2 text-3xl font-bold">{formatValue(current, m.format ?? "number")}</div>
                    {prev !== current && (
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        {delta >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                        <span className={delta >= 0 ? "text-emerald-600" : "text-rose-600"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</span>
                        <span className="text-muted-foreground">vs prev period</span>
                      </div>
                    )}
                    {m.target != null && (
                      <div className="mt-2 text-xs text-muted-foreground">Target: {formatValue(Number(m.target), m.format ?? "number")}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {charts.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {charts.map(({ id, metric: m, widget_type }) => {
              const { series } = compute(m);
              return (
                <Card key={id}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{m.name}</CardTitle></CardHeader>
                  <CardContent>
                    {series.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No data points yet.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        {widget_type === "bar" ? (
                          <BarChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="period" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip />
                            <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="period" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
