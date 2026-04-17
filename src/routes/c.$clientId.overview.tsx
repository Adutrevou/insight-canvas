import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatValue } from "@/lib/format";
import type { Metric, ManualUpdate } from "@/lib/db-types";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/c/$clientId/overview")({
  component: Overview,
});

function Overview() {
  const { clientId } = Route.useParams();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [updates, setUpdates] = useState<ManualUpdate[]>([]);

  useEffect(() => {
    supabase.from("metrics").select("*").eq("client_id", clientId).then(({ data }) => setMetrics((data ?? []) as Metric[]));
    supabase
      .from("manual_updates")
      .select("*")
      .eq("client_id", clientId)
      .order("period", { ascending: true })
      .then(({ data }) => setUpdates((data ?? []) as ManualUpdate[]));
  }, [clientId]);

  function aggregate(m: Metric): { current: number; prev: number; series: { period: string; value: number }[] } {
    const mUpdates = updates.filter((u) => u.metric_id === m.id);
    const byPeriod = new Map<string, number[]>();
    for (const u of mUpdates) {
      const arr = byPeriod.get(u.period) ?? [];
      arr.push(Number(u.value));
      byPeriod.set(u.period, arr);
    }
    const series = Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({
        period: period.slice(0, 7),
        value: m.aggregation === "avg" ? vals.reduce((s, v) => s + v, 0) / vals.length : vals.reduce((s, v) => s + v, 0),
      }));
    const current = series.length ? series[series.length - 1].value : 0;
    const prev = series.length > 1 ? series[series.length - 2].value : current;
    return { current, prev, series };
  }

  const kpis = metrics.slice(0, 4);
  const charts = metrics.slice(4, 10);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">Live KPIs and trend snapshots across your modules.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((m) => {
            const { current, prev } = aggregate(m);
            const delta = prev ? ((current - prev) / prev) * 100 : 0;
            return (
              <Card key={m.id}>
                <CardContent className="p-5">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.name}</div>
                  <div className="mt-2 text-3xl font-bold">{formatValue(current, m.format ?? "number")}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {delta >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-600" />
                    )}
                    <span className={delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">vs prev period</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {metrics.length === 0 && (
            <Card className="md:col-span-4">
              <CardContent className="py-10 text-center text-muted-foreground">
                No metrics yet — head to <strong>Metrics</strong> to build one, or seed a demo workspace.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {charts.map((m) => {
            const { series } = aggregate(m);
            return (
              <Card key={m.id}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{m.name}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    {m.chart_type === "bar" ? (
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
