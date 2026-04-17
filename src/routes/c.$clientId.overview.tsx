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
import { TrendingUp, TrendingDown, LayoutDashboard, Plus, CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  function inRange(dateStr: string | undefined | null): boolean {
    if (!dateRange?.from && !dateRange?.to) return true;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return true;
    if (dateRange.from && d < dateRange.from) return false;
    if (dateRange.to && d > dateRange.to) return false;
    return true;
  }

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

  function compute(m: Metric): {
    current: number; prev: number;
    series: { period: string; value: number }[];
    breakdown: { name: string; value: number }[];
  } {
    // Source-backed metric: aggregate from uploaded rows, grouped by period field if present
    if (m.data_source_id && m.field) {
      const rows = dataRows.filter((r) => r.data_source_id === m.data_source_id);
      const filters = (m.filters as { period_field?: string; category_field?: string } | null) ?? {};
      const periodKey = filters.period_field;
      const categoryKey = filters.category_field;
      const byPeriod = new Map<string, number[]>();
      const byCategory = new Map<string, number[]>();
      const allValues: number[] = [];
      for (const r of rows) {
        if (periodKey && !inRange(String(r.row_data[periodKey] ?? ""))) continue;
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
        if (categoryKey) {
          const c = String(r.row_data[categoryKey] ?? "").trim();
          if (c) {
            const arr = byCategory.get(c) ?? [];
            arr.push(num);
            byCategory.set(c, arr);
          }
        }
      }
      const series = Array.from(byPeriod.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, vals]) => ({ period, value: aggregateValues(vals, m.aggregation ?? "sum") }));
      const breakdown = Array.from(byCategory.entries())
        .map(([name, vals]) => ({ name, value: aggregateValues(vals, m.aggregation ?? "sum") }))
        .sort((a, b) => b.value - a.value);
      const current = series.length ? series[series.length - 1].value : aggregateValues(allValues, m.aggregation ?? "sum");
      const prev = series.length > 1 ? series[series.length - 2].value : current;
      return { current, prev, series, breakdown };
    }

    // Manual-update-backed metric
    const mUpdates = updates.filter((u) => u.metric_id === m.id && inRange(u.period));
    const byPeriod = new Map<string, number[]>();
    const byCategory = new Map<string, number[]>();
    for (const u of mUpdates) {
      const arr = byPeriod.get(u.period) ?? [];
      arr.push(Number(u.value));
      byPeriod.set(u.period, arr);
      if (u.category) {
        const c = byCategory.get(u.category) ?? [];
        c.push(Number(u.value));
        byCategory.set(u.category, c);
      }
    }
    const series = Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({ period: period.slice(0, 7), value: aggregateValues(vals, m.aggregation ?? "sum") }));
    const breakdown = Array.from(byCategory.entries())
      .map(([name, vals]) => ({ name, value: aggregateValues(vals, m.aggregation ?? "sum") }))
      .sort((a, b) => b.value - a.value);
    const current = series.length ? series[series.length - 1].value : 0;
    const prev = series.length > 1 ? series[series.length - 2].value : current;
    return { current, prev, series, breakdown };
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
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to
                      ? `${format(dateRange.from, "LLL d, y")} – ${format(dateRange.to, "LLL d, y")}`
                      : format(dateRange.from, "LLL d, y")
                  ) : (
                    <span>All time</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {dateRange && (
              <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)} title="Clear date range">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/c/$clientId/dashboard-builder" params={{ clientId }}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" />Customize dashboard
              </Link>
            </Button>
          </div>
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
              const { series, breakdown, current } = compute(m);
              const pieData = breakdown.length ? breakdown : series.map((s) => ({ name: s.period, value: s.value }));
              const hasSeries = series.length > 0;
              const hasBreakdown = pieData.length > 0;
              const target = m.target ? Number(m.target) : 0;
              const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : Math.min(100, Math.max(0, current));

              return (
                <Card key={id}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{m.name}</CardTitle></CardHeader>
                  <CardContent>
                    {widget_type === "bar" && hasSeries && (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={series}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="period" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {widget_type === "line" && hasSeries && (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={series}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="period" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    {widget_type === "area" && hasSeries && (
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={series}>
                          <defs>
                            <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="period" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill={`url(#grad-${id})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                    {(widget_type === "pie" || widget_type === "donut") && hasBreakdown && (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={widget_type === "donut" ? 55 : 0}
                            paddingAngle={2}
                          >
                            {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {widget_type === "gauge" && (
                      <div className="space-y-3 py-2">
                        <ResponsiveContainer width="100%" height={180}>
                          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: m.name, value: pct, fill: "var(--chart-1)" }]} startAngle={210} endAngle={-30}>
                            <RadialBar background dataKey="value" cornerRadius={8} />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatValue(current, m.format ?? "number")}</div>
                          {target > 0 && <div className="text-xs text-muted-foreground">{pct.toFixed(0)}% of target ({formatValue(target, m.format ?? "number")})</div>}
                        </div>
                        <Progress value={pct} />
                      </div>
                    )}
                    {widget_type === "table" && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{breakdown.length ? "Category" : "Period"}</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(breakdown.length ? breakdown : series.map((s) => ({ name: s.period, value: s.value }))).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell>{row.name}</TableCell>
                              <TableCell className="text-right font-mono">{formatValue(row.value, m.format ?? "number")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {widget_type === "stat-list" && hasBreakdown && (
                      <div className="space-y-2">
                        {pieData.slice(0, 8).map((row, i) => {
                          const max = Math.max(...pieData.map((p) => p.value));
                          const w = max > 0 ? (row.value / max) * 100 : 0;
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{row.name}</span>
                                <span className="font-mono text-muted-foreground">{formatValue(row.value, m.format ?? "number")}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${w}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!hasSeries && !hasBreakdown && widget_type !== "gauge" && (
                      <div className="py-8 text-center text-sm text-muted-foreground">No data points yet.</div>
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
