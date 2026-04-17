import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Dashboard, DashboardWidget, Metric } from "@/lib/db-types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/dashboard-builder")({ component: DashboardBuilder });

function DashboardBuilder() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [pickMetric, setPickMetric] = useState("");
  const [pickType, setPickType] = useState("kpi");

  async function load() {
    const { data: ms } = await supabase.from("metrics").select("*").eq("client_id", clientId);
    setMetrics((ms ?? []) as Metric[]);
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
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clientId, user]);

  async function addWidget() {
    if (!dashboard || !pickMetric) return;
    const pos = widgets.length;
    const { error } = await supabase.from("dashboard_widgets").insert({
      dashboard_id: dashboard.id, metric_id: pickMetric, widget_type: pickType, position: pos,
    });
    if (error) return toast.error(error.message);
    setPickMetric("");
    load();
  }

  async function remove(id: string) {
    await supabase.from("dashboard_widgets").delete().eq("id", id);
    load();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = widgets.findIndex((w) => w.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= widgets.length) return;
    const a = widgets[idx], b = widgets[swap];
    await Promise.all([
      supabase.from("dashboard_widgets").update({ position: b.position }).eq("id", a.id),
      supabase.from("dashboard_widgets").update({ position: a.position }).eq("id", b.id),
    ]);
    load();
  }

  const metricById = (id?: string | null) => metrics.find((m) => m.id === id);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Builder</h1>
          <p className="text-sm text-muted-foreground">Compose the Overview from your metrics. Widgets render in the order below.</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Add a widget</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Metric</div>
            <Select value={pickMetric} onValueChange={setPickMetric}>
              <SelectTrigger><SelectValue placeholder="Choose metric" /></SelectTrigger>
              <SelectContent>{metrics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Widget type</div>
            <Select value={pickType} onValueChange={setPickType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { v: "kpi", l: "KPI Card" },
                  { v: "line", l: "Line Chart" },
                  { v: "bar", l: "Bar Chart" },
                  { v: "area", l: "Area Chart" },
                  { v: "pie", l: "Pie Chart" },
                  { v: "donut", l: "Donut Chart" },
                  { v: "gauge", l: "Gauge / Progress" },
                  { v: "table", l: "Data Table" },
                  { v: "stat-list", l: "Breakdown List" },
                ].map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addWidget} disabled={!pickMetric}><Plus className="mr-1.5 h-4 w-4" />Add widget</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Layout ({widgets.length} widgets)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {widgets.map((w, i) => {
            const m = metricById(w.metric_id);
            return (
              <div key={w.id} className="flex items-center gap-3 rounded-md border bg-card p-3">
                <div className="font-mono text-xs text-muted-foreground w-6">{i + 1}.</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{m?.name ?? "(metric removed)"}</div>
                  <div className="text-xs text-muted-foreground uppercase">{w.widget_type}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => move(w.id, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(w.id, 1)} disabled={i === widgets.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            );
          })}
          {widgets.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No widgets yet — add one above.</div>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
