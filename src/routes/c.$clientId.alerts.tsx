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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Bell } from "lucide-react";
import type { AlertRule, Notification, Metric, AlertCondition } from "@/lib/db-types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/alerts")({ component: AlertsPage });

function AlertsPage() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; metric_id: string; condition: AlertCondition; threshold: string }>({
    name: "", metric_id: "", condition: "above", threshold: "",
  });

  const load = () => {
    supabase.from("alert_rules").select("*").eq("client_id", clientId).then(({ data }) => setRules((data ?? []) as AlertRule[]));
    supabase.from("metrics").select("*").eq("client_id", clientId).then(({ data }) => setMetrics((data ?? []) as Metric[]));
    if (user) supabase.from("notifications").select("*").eq("client_id", clientId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotifs((data ?? []) as Notification[]));
  };
  useEffect(load, [clientId, user]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.metric_id) return;
    const { error } = await supabase.from("alert_rules").insert({
      client_id: clientId, name: form.name, metric_id: form.metric_id, condition: form.condition,
      threshold: form.threshold ? Number(form.threshold) : null, created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Alert rule created");
    setOpen(false); setForm({ name: "", metric_id: "", condition: "above", threshold: "" }); load();
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Alerts</h1><p className="text-sm text-muted-foreground">Configurable rules and notification center.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />New rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New alert rule</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Metric</Label>
                <Select value={form.metric_id} onValueChange={(v) => setForm({ ...form, metric_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>{metrics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Condition</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as AlertCondition })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above threshold</SelectItem>
                      <SelectItem value="below">Below threshold</SelectItem>
                      <SelectItem value="change_pct">Changed by %</SelectItem>
                      <SelectItem value="missing_update">Missing update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Threshold</Label><Input type="number" step="any" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></div>
              </div>
              <DialogFooter><Button type="submit">Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Rules ({rules.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Condition</TableHead><TableHead>Threshold</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.condition}</TableCell>
                    <TableCell>{r.threshold ?? "—"}</TableCell>
                    <TableCell>{r.active ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No rules.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notifs.map((n) => (
              <div key={n.id} className={`rounded-md border p-3 text-sm ${n.read ? "bg-muted/30" : "bg-card"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>{n.message}</div>
                  {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at!).toLocaleString()}</div>
              </div>
            ))}
            {notifs.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No notifications.</div>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
