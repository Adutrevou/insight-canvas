import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { Metric, ManualUpdate, Client } from "@/lib/db-types";
import { formatValue } from "@/lib/format";

export const Route = createFileRoute("/c/$clientId/reports")({ component: ReportsPage });

function ReportsPage() {
  const { clientId } = Route.useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [updates, setUpdates] = useState<ManualUpdate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle().then(({ data }) => setClient(data as Client));
    supabase.from("metrics").select("*").eq("client_id", clientId).then(({ data }) => {
      const m = (data ?? []) as Metric[];
      setMetrics(m);
      setSelected(new Set(m.map((x) => x.id)));
    });
    supabase.from("manual_updates").select("*").eq("client_id", clientId).then(({ data }) => setUpdates((data ?? []) as ManualUpdate[]));
  }, [clientId]);

  function aggregate(m: Metric): number {
    const vals = updates.filter((u) => u.metric_id === m.id).map((u) => Number(u.value));
    if (!vals.length) return 0;
    if (m.aggregation === "avg") return vals.reduce((s, v) => s + v, 0) / vals.length;
    return vals.reduce((s, v) => s + v, 0);
  }

  const chosen = metrics.filter((m) => selected.has(m.id));

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(client?.name ?? "Report", 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25);
    doc.setTextColor(0); doc.setFontSize(12); doc.text("Summary", 14, 38);
    let y = 46;
    chosen.forEach((m) => {
      doc.setFontSize(10);
      doc.text(`${m.name}: ${formatValue(aggregate(m), m.format)}`, 14, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    if (notes) {
      doc.setFontSize(12); doc.text("Notes", 14, y + 6);
      doc.setFontSize(10); doc.text(notes, 14, y + 14, { maxWidth: 180 });
    }
    doc.save(`${client?.slug ?? "report"}-${Date.now()}.pdf`);
  }

  function exportXLSX() {
    const data = chosen.map((m) => ({ Metric: m.name, Aggregation: m.aggregation, Value: aggregate(m), Format: m.format, Target: m.target }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${client?.slug ?? "report"}-${Date.now()}.xlsx`);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Build and export branded reports as PDF or Excel.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><CardTitle>Choose metrics</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {metrics.map((m) => (
              <label key={m.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                <Checkbox checked={selected.has(m.id)} onCheckedChange={(c) => {
                  const s = new Set(selected);
                  if (c) s.add(m.id); else s.delete(m.id);
                  setSelected(s);
                }} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{formatValue(aggregate(m), m.format)}</div>
                </div>
              </label>
            ))}
            {metrics.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No metrics yet.</div>}
            <div>
              <Label>Notes / commentary</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add commentary…" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Preview & export</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-lg font-semibold">{client?.name}</div>
              <div className="text-xs text-muted-foreground">Generated {new Date().toLocaleDateString()}</div>
              <div className="mt-3 space-y-1.5 text-sm">
                {chosen.map((m) => (
                  <div key={m.id} className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">{m.name}</span>
                    <span className="font-medium">{formatValue(aggregate(m), m.format)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportPDF} className="flex-1"><Download className="mr-1.5 h-4 w-4" />PDF</Button>
              <Button onClick={exportXLSX} variant="outline" className="flex-1"><Download className="mr-1.5 h-4 w-4" />Excel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
