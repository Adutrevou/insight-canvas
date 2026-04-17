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
import { Plus } from "lucide-react";
import type { Metric } from "@/lib/db-types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/metrics")({ component: MetricsPage });

function MetricsPage() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", aggregation: "sum", format: "number", chart_type: "kpi", target: "" });

  const load = () => supabase.from("metrics").select("*").eq("client_id", clientId).then(({ data }) => setMetrics((data ?? []) as Metric[]));
  useEffect(() => { load(); }, [clientId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("metrics").insert({
      client_id: clientId,
      name: form.name,
      aggregation: form.aggregation,
      format: form.format,
      chart_type: form.chart_type,
      target: form.target ? Number(form.target) : null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Metric created");
    setOpen(false);
    setForm({ name: "", aggregation: "sum", format: "number", chart_type: "kpi", target: "" });
    load();
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-sm text-muted-foreground">Build configurable KPIs from your data.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />New metric</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create metric</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Aggregation</Label>
                  <Select value={form.aggregation} onValueChange={(v) => setForm({ ...form, aggregation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["sum", "avg", "count", "min", "max"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["number", "currency", "percentage"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chart</Label>
                  <Select value={form.chart_type} onValueChange={(v) => setForm({ ...form, chart_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["kpi", "line", "bar"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
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
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Agg</TableHead><TableHead>Format</TableHead><TableHead>Chart</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.aggregation}</TableCell>
                  <TableCell>{m.format}</TableCell>
                  <TableCell>{m.chart_type}</TableCell>
                  <TableCell>{m.target ?? "—"}</TableCell>
                </TableRow>
              ))}
              {metrics.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No metrics yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
