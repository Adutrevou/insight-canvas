import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import type { Metric, ManualUpdate } from "@/lib/db-types";
import { toast } from "sonner";
import { evaluateAlertsForMetric } from "@/lib/alerts";

export const Route = createFileRoute("/c/$clientId/updates")({ component: UpdatesPage });

function UpdatesPage() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [history, setHistory] = useState<(ManualUpdate & { metric?: { name: string } })[]>([]);
  const [form, setForm] = useState({ metric_id: "", value: "", period: new Date().toISOString().slice(0, 10), category: "", note: "" });

  const load = () => {
    supabase.from("metrics").select("*").eq("client_id", clientId).then(({ data }) => setMetrics((data ?? []) as Metric[]));
    supabase
      .from("manual_updates")
      .select("*, metric:metrics(name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data ?? []) as (ManualUpdate & { metric?: { name: string } })[]));
  };
  useEffect(load, [clientId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !form.metric_id) return;
    const value = Number(form.value);
    const { error } = await supabase.from("manual_updates").insert({
      client_id: clientId,
      metric_id: form.metric_id,
      value,
      period: form.period,
      category: form.category || null,
      note: form.note || null,
      user_id: user.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      client_id: clientId,
      user_id: user.id,
      action: "manual_update",
      entity: "metric",
      entity_id: form.metric_id,
      diff: { value, period: form.period },
    });
    const triggered = await evaluateAlertsForMetric({ clientId, metricId: form.metric_id, newValue: value, userId: user.id });
    toast.success(triggered.length ? `Update saved · ${triggered.length} alert(s) triggered` : "Update saved");
    setForm({ ...form, value: "", note: "" });
    load();
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manual Updates</h1>
        <p className="text-sm text-muted-foreground">Enter individual metric values. Alert rules evaluate on save.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Card>
          <CardHeader><CardTitle>New entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>Metric</Label>
                <Select value={form.metric_id} onValueChange={(v) => setForm({ ...form, metric_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>{metrics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Value</Label><Input type="number" step="any" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                <div><Label>Period</Label><Input type="date" required value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              </div>
              <div><Label>Category (optional)</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Note (optional)</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              <Button type="submit" className="w-full">Save update</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent updates</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Period</TableHead><TableHead>Value</TableHead><TableHead>Category</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.metric?.name ?? "—"}</TableCell>
                    <TableCell>{h.period}</TableCell>
                    <TableCell>{h.value}</TableCell>
                    <TableCell>{h.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(h.created_at!).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No entries yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
