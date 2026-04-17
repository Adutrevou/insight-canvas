import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Metric, DataSource, FieldMapping } from "@/lib/db-types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/metrics")({ component: MetricsPage });

const MANUAL = "__manual__";

function MetricsPage() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    aggregation: "sum",
    format: "number",
    chart_type: "kpi",
    target: "",
    data_source_id: MANUAL,
    field: "",
    period_field: "",
  });

  async function load() {
    const [{ data: ms }, { data: ds }] = await Promise.all([
      supabase.from("metrics").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("data_sources").select("*").eq("client_id", clientId),
    ]);
    setMetrics((ms ?? []) as Metric[]);
    setSources((ds ?? []) as DataSource[]);
    const ids = (ds ?? []).map((d) => d.id);
    if (ids.length) {
      const { data: fm } = await supabase.from("field_mappings").select("*").in("data_source_id", ids);
      setMappings((fm ?? []) as FieldMapping[]);
    } else {
      setMappings([]);
    }
  }
  useEffect(() => { load(); }, [clientId]);

  const sourceFields = mappings.filter((m) => m.data_source_id === form.data_source_id);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const isSourceBound = form.data_source_id !== MANUAL;
    if (isSourceBound && !form.field) return toast.error("Pick a field to aggregate");
    const { error } = await supabase.from("metrics").insert({
      client_id: clientId,
      name: form.name,
      aggregation: form.aggregation,
      format: form.format,
      chart_type: form.chart_type,
      target: form.target ? Number(form.target) : null,
      data_source_id: isSourceBound ? form.data_source_id : null,
      field: isSourceBound ? form.field : null,
      filters: isSourceBound && form.period_field ? { period_field: form.period_field } : {},
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Metric created");
    setOpen(false);
    setForm({ name: "", aggregation: "sum", format: "number", chart_type: "kpi", target: "", data_source_id: MANUAL, field: "", period_field: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this metric?")) return;
    const { error } = await supabase.from("metrics").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-sm text-muted-foreground">Build KPIs from uploaded data or manual updates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />New metric</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create metric</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>

              <div>
                <Label>Source</Label>
                <Select value={form.data_source_id} onValueChange={(v) => setForm({ ...form, data_source_id: v, field: "", period_field: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MANUAL}>Manual updates</SelectItem>
                    {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.data_source_id !== MANUAL && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Field to aggregate</Label>
                    <Select value={form.field} onValueChange={(v) => setForm({ ...form, field: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose field" /></SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((f) => <SelectItem key={f.id} value={f.source_field}>{f.label} ({f.field_type})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Period field (optional)</Label>
                    <Select value={form.period_field || "__none__"} onValueChange={(v) => setForm({ ...form, period_field: v === "__none__" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None (single total)</SelectItem>
                        {sourceFields.map((f) => <SelectItem key={f.id} value={f.source_field}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Aggregation</Label>
                  <Select value={form.aggregation} onValueChange={(v) => setForm({ ...form, aggregation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["sum", "avg", "count", "min", "max"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["number", "currency", "percentage"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chart</Label>
                  <Select value={form.chart_type} onValueChange={(v) => setForm({ ...form, chart_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["kpi", "line", "bar"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Target</Label><Input type="number" step="any" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
              </div>
              <DialogFooter><Button type="submit">Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All metrics ({metrics.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Source</TableHead><TableHead>Field</TableHead><TableHead>Agg</TableHead><TableHead>Format</TableHead><TableHead>Chart</TableHead><TableHead>Target</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs">{m.data_source_id ? (sources.find((s) => s.id === m.data_source_id)?.name ?? "—") : "Manual"}</TableCell>
                  <TableCell className="text-xs font-mono">{m.field ?? "—"}</TableCell>
                  <TableCell>{m.aggregation}</TableCell>
                  <TableCell>{m.format}</TableCell>
                  <TableCell>{m.chart_type}</TableCell>
                  <TableCell>{m.target ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {metrics.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No metrics yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
